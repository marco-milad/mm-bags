import "server-only";

import { cookies, headers } from "next/headers";
import { isbot } from "isbot";
import { analyticsTable, type AnalyticsEventRow } from "@/lib/analytics/db";
import {
  CONSENT_COOKIE,
  OPTOUT_COOKIE,
  SESSION_COOKIE,
  trackingAllowed,
  UUID_RE,
  VISITOR_COOKIE,
} from "@/lib/analytics/identity";
import { browserFrom, deviceTypeFrom, osFrom } from "@/lib/analytics/text";

/** Only a confirmation seen this soon after the order counts as "the buyer". */
const FRESH_MS = 30 * 60 * 1000;

/**
 * Server-side `purchase` logging — the link between an analytics session and a
 * real order, which is what makes cart abandonment and per-channel conversion
 * measurable.
 *
 * Like `search`, the client can never send this event (it is absent from the
 * /api/events allow-list), so a purchase cannot be forged. Guarantees:
 *
 *   - Idempotent: the event id IS the order id, upserted with ignoreDuplicates,
 *     so refreshing or re-sharing the confirmation page never double-counts.
 *   - Fresh only: logged only within 30 minutes of the order, so someone opening
 *     an old shared confirmation link is not credited with the purchase.
 *   - Same consent / bot / prefetch / identity guards as every other writer.
 *   - Never awaited on the render path and never throws.
 *
 * The amount is NOT the source of truth for revenue — reports join the order id
 * back to the orders table. `value` is kept in props only as a convenience.
 */
export async function logPurchase(input: {
  orderId: string;
  total: number;
  createdAt: string;
  locale?: string;
  path?: string;
}): Promise<void> {
  if (!UUID_RE.test(input.orderId)) return;
  if (Date.now() - new Date(input.createdAt).getTime() > FRESH_MS) return;

  const h = await headers();
  const ua = h.get("user-agent") ?? "";
  const isPrefetch =
    h.get("purpose") === "prefetch" ||
    h.get("x-purpose") === "preview" ||
    (h.get("sec-purpose") ?? "").includes("prefetch");
  if (isPrefetch || isbot(ua)) return;

  const jar = await cookies();
  if (!trackingAllowed(jar.get(CONSENT_COOKIE)?.value, jar.get(OPTOUT_COOKIE)?.value)) {
    return;
  }
  const visitorId = jar.get(VISITOR_COOKIE)?.value;
  const sessionId = jar.get(SESSION_COOKIE)?.value;
  if (!visitorId || !UUID_RE.test(visitorId)) return;
  if (!sessionId || !UUID_RE.test(sessionId)) return;

  const row: AnalyticsEventRow = {
    id: input.orderId,
    name: "purchase",
    occurred_at: new Date().toISOString(),
    visitor_id: visitorId,
    session_id: sessionId,
    path: input.path ?? null,
    locale: input.locale ?? null,
    device_type: deviceTypeFrom(ua),
    browser: browserFrom(ua),
    os: osFrom(ua),
    country: h.get("x-vercel-ip-country") || null,
    props: { order_id: input.orderId, value: input.total },
  };

  const { error } = await analyticsTable("analytics_events").upsert([row], {
    onConflict: "id",
    ignoreDuplicates: true,
  });
  if (error) console.warn("[analytics] purchase log failed:", error.message);
}
