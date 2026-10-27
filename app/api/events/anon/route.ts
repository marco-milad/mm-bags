import { cookies, headers } from "next/headers";
import { isbot } from "isbot";
import { z } from "zod";
import { analyticsTable, type AnalyticsAnonEventRow } from "@/lib/analytics/db";
import { OPTOUT_COOKIE, UUID_RE } from "@/lib/analytics/identity";
import { browserFrom, channelFrom, deviceTypeFrom, osFrom } from "@/lib/analytics/text";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BATCH = 20;

/**
 * Anonymous, cookieless measurement (migration 0030) for visitors who
 * declined or never answered the analytics banner.
 *
 * What makes it anonymous, enforced HERE rather than trusted from the client:
 *   - no identity cookie is read and no cookie is ever set;
 *   - the IP is never stored (country comes from the edge header only);
 *   - the only link between rows is `visitKey`, a random id the page keeps
 *     in memory for one tab — a return visit can never be matched to it;
 *   - an explicit opt-out (mm_optout cookie or Sec-GPC: 1) drops everything.
 */
const ANON_EVENT_NAMES = [
  "page_view",
  "view_item",
  "select_item",
  "add_to_cart",
  "consent_accepted",
  "consent_rejected",
] as const;

const eventSchema = z
  .object({
    id: z.string().regex(UUID_RE),
    name: z.enum(ANON_EVENT_NAMES),
    occurredAt: z.string().datetime().optional(),
    path: z.string().max(512).optional(),
    locale: z.string().max(8).optional(),
    referrerDomain: z.string().max(253).optional(),
    productId: z.string().uuid().optional(),
    listId: z.string().max(64).optional(),
    position: z.number().int().min(0).max(10_000).optional(),
    utmSource: z.string().max(200).optional(),
    utmMedium: z.string().max(200).optional(),
    utmCampaign: z.string().max(200).optional(),
  })
  // Unknown keys (e.g. a searchId) are rejected, not ignored.
  .strict();

const batchSchema = z
  .object({
    visitKey: z.string().regex(UUID_RE),
    events: z.array(eventSchema).min(1).max(MAX_BATCH),
  })
  .strict();

/** Clock skew guard: a client timestamp is used only if it's plausible. */
function plausibleTime(iso: string | undefined): string {
  const now = Date.now();
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isFinite(t) && t <= now + 60_000 && t >= now - 24 * 3600_000
    ? new Date(t).toISOString()
    : new Date(now).toISOString();
}

export async function POST(request: Request) {
  const h = await headers();
  const isPrefetch =
    h.get("purpose") === "prefetch" ||
    h.get("x-purpose") === "preview" ||
    (h.get("sec-purpose") ?? "").includes("prefetch");
  const optedOut = (await cookies()).get(OPTOUT_COOKIE)?.value === "1" || h.get("sec-gpc") === "1";
  const ua = h.get("user-agent") ?? "";

  // Always 204: a beacon has nobody to read a body.
  if (optedOut || isPrefetch || isbot(ua)) return new Response(null, { status: 204 });

  let parsed;
  try {
    parsed = batchSchema.safeParse(JSON.parse(await request.text()));
  } catch {
    return new Response(null, { status: 204 });
  }
  if (!parsed.success) return new Response(null, { status: 204 });

  const deviceType = deviceTypeFrom(ua);
  const browser = browserFrom(ua);
  const os = osFrom(ua);
  const country = h.get("x-vercel-ip-country") || null;
  const { visitKey } = parsed.data;

  const rows: AnalyticsAnonEventRow[] = parsed.data.events.map((e) => ({
    id: e.id,
    name: e.name,
    occurred_at: plausibleTime(e.occurredAt),
    visit_key: visitKey,
    path: e.path ?? null,
    locale: e.locale ?? null,
    referrer_domain: e.referrerDomain ?? null,
    channel: channelFrom({ referrerDomain: e.referrerDomain, utmMedium: e.utmMedium, utmSource: e.utmSource }),
    utm_source: e.utmSource ?? null,
    utm_medium: e.utmMedium ?? null,
    utm_campaign: e.utmCampaign ?? null,
    device_type: deviceType,
    browser,
    os,
    country,
    product_id: e.productId ?? null,
    list_id: e.listId ?? null,
    position: e.position ?? null,
  }));

  // Idempotent by client id: a retried beacon carries the same ids.
  const { error } = await analyticsTable("analytics_anon_events").upsert(rows, {
    onConflict: "id",
    ignoreDuplicates: true,
  });
  if (error) console.warn("[analytics/anon] ingest failed:", error.message);

  return new Response(null, { status: 204 });
}
