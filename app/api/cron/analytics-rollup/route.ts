import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Nightly analytics maintenance: roll up, prune, then scan for PII.
 *
 * Auth mirrors /api/cron/expire-instapay: Vercel sends
 * `Authorization: Bearer ${CRON_SECRET}`, and this fails CLOSED when the secret
 * is not configured.
 *
 * Scheduling note. Vercel cron schedules are UTC and Egypt observes DST
 * (UTC+2 winter, UTC+3 summer), so the vercel.json entry uses `30 22 * * *` —
 * 00:30 Cairo in winter, 01:30 in summer, safely past midnight in both. A job
 * running just after midnight must still finalise the day that just ended,
 * which is why the default rolls 2 days rather than 1.
 *
 * All three steps are idempotent, so a missed night is repaired by the next
 * run (widen p_days to backfill further).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    console.error("[cron/analytics-rollup] CRON_SECRET is not configured — refusing to run.");
    return NextResponse.json({ error: "cron secret not configured" }, { status: 503 });
  }
  const provided = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  const authorized =
    provided.length === expected.length && timingSafeEqual(provided, expected);
  if (!authorized) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const daysParam = Number(url.searchParams.get("days"));
  const days = Number.isInteger(daysParam) && daysParam > 0 ? Math.min(daysParam, 400) : 2;

  const admin = getSupabaseAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated
  // types predate migration 0018.
  const rpc = (fn: string, args?: Record<string, unknown>) =>
    admin.rpc(fn as any, args as any);

  const rollup = await rpc("analytics_rollup", { p_days: days });
  if (rollup.error) {
    console.error("[cron/analytics-rollup] rollup failed:", rollup.error.message);
    return NextResponse.json({ ok: false, step: "rollup" }, { status: 500 });
  }

  const prune = await rpc("analytics_prune");
  if (prune.error) {
    console.error("[cron/analytics-rollup] prune failed:", prune.error.message);
    return NextResponse.json({ ok: false, step: "prune" }, { status: 500 });
  }

  const scan = await rpc("analytics_pii_scan");
  if (scan.error) {
    console.error("[cron/analytics-rollup] pii scan failed:", scan.error.message);
    return NextResponse.json({ ok: false, step: "pii_scan" }, { status: 500 });
  }

  const findings = scan.data as unknown as { total: number } | null;
  console.log(
    `[cron/analytics-rollup] rollup=${JSON.stringify(rollup.data)} ` +
      `prune=${JSON.stringify(prune.data)} piiFindings=${findings?.total ?? 0}`,
  );

  // Report, never auto-delete — deleting hides the signal the scan exists to
  // surface. Exiting non-2xx makes it show up as a failed cron someone
  // actually notices, rather than a line in a log nobody reads.
  if ((findings?.total ?? 0) > 0) {
    console.error("[cron/analytics-rollup] PII DETECTED:", JSON.stringify(scan.data));
    return NextResponse.json({ ok: false, step: "pii_scan", findings: scan.data }, { status: 500 });
  }

  return NextResponse.json({ ok: true, rollup: rollup.data, prune: prune.data });
}
