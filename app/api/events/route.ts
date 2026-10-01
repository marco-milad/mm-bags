import { cookies, headers } from "next/headers";
import { isbot } from "isbot";
import { z } from "zod";
import { analyticsTable, type AnalyticsEventRow } from "@/lib/analytics/db";
import {
  CONSENT_COOKIE,
  OPTOUT_COOKIE,
  SESSION_COOKIE,
  trackingAllowed,
  VISITOR_COOKIE,
  UUID_RE,
} from "@/lib/analytics/identity";
import {
  browserFrom,
  channelFrom,
  deviceTypeFrom,
  osFrom,
} from "@/lib/analytics/text";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BATCH = 20;

/**
 * Client-sendable events only.
 *
 * `search` is absent on purpose: only the server knows result_count and
 * result_ids, and a client-sent count can be forged. It is written where the
 * query actually executes.
 */
const CLIENT_EVENT_NAMES = ["page_view", "view_item", "select_item", "add_to_cart"] as const;

const eventSchema = z
  .object({
    id: z.string().regex(UUID_RE),
    name: z.enum(CLIENT_EVENT_NAMES),
    occurredAt: z.string().datetime().optional(),
    path: z.string().max(512).optional(),
    locale: z.string().max(8).optional(),
    referrerDomain: z.string().max(253).optional(),
    productId: z.string().uuid().optional(),
    searchId: z.string().uuid().optional(),
    listId: z.string().max(64).optional(),
    position: z.number().int().min(0).max(10_000).optional(),
    utmSource: z.string().max(200).optional(),
    utmMedium: z.string().max(200).optional(),
    utmCampaign: z.string().max(200).optional(),
  })
  // Unknown keys are rejected rather than ignored: the payload is attacker
  // controlled and every accepted field is one more thing to reason about.
  .strict();

const batchSchema = z.object({
  events: z.array(eventSchema).min(1).max(MAX_BATCH),
});

export async function POST(request: Request) {
  const h = await headers();

  // A prefetch is the browser guessing, not a person looking.
  //
  // Verified against Next 16 rather than assumed: `next-router-prefetch` is
  // consumed by the framework and never reaches a route handler, so it is not
  // checked here. `purpose`, `x-purpose` and `sec-purpose` all arrive intact.
  const isPrefetch =
    h.get("purpose") === "prefetch" ||
    h.get("x-purpose") === "preview" ||
    (h.get("sec-purpose") ?? "").includes("prefetch");

  const jar = await cookies();
  const visitorId = jar.get(VISITOR_COOKIE)?.value;
  const sessionId = jar.get(SESSION_COOKIE)?.value;
  // Consent is checked here as well as in the proxy. Without consent no ids
  // are minted, so the id check below would already reject the batch — but a
  // forged or stale cookie pair must not be enough to get a row written.
  const allowed = trackingAllowed(
    jar.get(CONSENT_COOKIE)?.value,
    jar.get(OPTOUT_COOKIE)?.value,
  );

  // An event with no identity is not attributable to anyone and would pollute
  // every distinct count, so drop the batch rather than store it half-blind.
  //
  // Always answer 204 regardless of why: a beacon has nobody to read a body,
  // and reporting which events were dropped would leak the filter rules.
  if (
    !allowed ||
    isPrefetch ||
    isbot(h.get("user-agent") ?? "") ||
    !visitorId ||
    !UUID_RE.test(visitorId) ||
    !sessionId ||
    !UUID_RE.test(sessionId)
  ) {
    return new Response(null, { status: 204 });
  }

  let parsed;
  try {
    // sendBeacon sends text/plain, so req.json() is not reliable here.
    parsed = batchSchema.safeParse(JSON.parse(await request.text()));
  } catch {
    return new Response(null, { status: 204 });
  }
  if (!parsed.success) return new Response(null, { status: 204 });

  const ua = h.get("user-agent") ?? "";
  const deviceType = deviceTypeFrom(ua);
  const browser = browserFrom(ua);
  const os = osFrom(ua);
  // Vercel edge geo — the COUNTRY only, derived at the edge from the IP that
  // is never itself stored (same privacy stance as the rest of the system).
  const country = h.get("x-vercel-ip-country") || null;

  const rows: AnalyticsEventRow[] = parsed.data.events.map((e) => ({
    id: e.id,
    name: e.name,
    occurred_at: e.occurredAt ?? new Date().toISOString(),
    visitor_id: visitorId,
    session_id: sessionId,
    path: e.path ?? null,
    locale: e.locale ?? null,
    referrer_domain: e.referrerDomain ?? null,
    device_type: deviceType,
    browser,
    os,
    country,
    utm_source: e.utmSource ?? null,
    utm_medium: e.utmMedium ?? null,
    utm_campaign: e.utmCampaign ?? null,
    channel: channelFrom({
      referrerDomain: e.referrerDomain,
      utmMedium: e.utmMedium,
      utmSource: e.utmSource,
    }),
    product_id: e.productId ?? null,
    search_id: e.searchId ?? null,
    list_id: e.listId ?? null,
    position: e.position ?? null,
  }));

  // Idempotent by client-generated id. A plain insert throws on a duplicate,
  // and under fire-and-forget that is a lost event rather than idempotency:
  // retried beacons carry the same ids by design.
  const { error } = await analyticsTable("analytics_events").upsert(rows, {
    onConflict: "id",
    ignoreDuplicates: true,
  });

  if (error) console.warn("[analytics] ingest failed:", error.message);

  return new Response(null, { status: 204 });
}
