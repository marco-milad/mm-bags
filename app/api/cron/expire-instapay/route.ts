import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { runInstapayExpirySweep } from "@/lib/orders/instapay-expiry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/cron/expire-instapay
 *
 * Vercel Cron target: cancels unpaid InstaPay orders whose business-
 * hours payment window elapsed and restores their stock (see
 * lib/orders/instapay-expiry.ts + migration 0015 for the atomicity
 * story; the sweep no-ops outside 11:00–22:00 Africa/Cairo).
 *
 * Auth: Vercel sends `Authorization: Bearer ${CRON_SECRET}` on every
 * cron invocation when the CRON_SECRET env var is set. Fail CLOSED:
 * if the secret isn't configured we refuse to run rather than expose
 * an unauthenticated destructive endpoint. The same header lets Marco
 * trigger a manual sweep with curl.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    console.error("[cron/expire-instapay] CRON_SECRET is not configured — refusing to run.");
    return NextResponse.json({ error: "cron secret not configured" }, { status: 503 });
  }
  const provided = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  const authorized =
    provided.length === expected.length && timingSafeEqual(provided, expected);
  if (!authorized) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await runInstapayExpirySweep();
  if (!result.ok) {
    console.error("[cron/expire-instapay] sweep failed:", result.error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  // Structured, non-sensitive log: order numbers only — no customer data.
  console.log(
    `[cron/expire-instapay] expired=${result.expired.length} emailed=${result.emailed}` +
      (result.expired.length
        ? ` orders=${result.expired.map((o) => o.orderNumber).join(",")}`
        : ""),
  );

  return NextResponse.json({
    ok: true,
    expired: result.expired.length,
    orders: result.expired.map((o) => o.orderNumber),
    emailed: result.emailed,
  });
}
