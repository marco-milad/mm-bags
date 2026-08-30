/**
 * Visitor identity: cookie names, attributes, and the visitor upsert.
 *
 * Imported by proxy.ts, so everything here must run on the Edge runtime — no
 * Node built-ins, no Supabase client. The upsert goes straight to PostgREST
 * over fetch.
 *
 * Identity comes from a cookie and never from the client IP. On Vercel,
 * x-forwarded-for and x-vercel-forwarded-for are proxy-supplied, and Egyptian
 * mobile carriers put thousands of subscribers behind one CGNAT address, so an
 * IP+UA hash collapses most of the audience into a handful of identities.
 */

export const VISITOR_COOKIE = "mm_vid";
export const SESSION_COOKIE = "mm_sid";
export const OPTOUT_COOKIE = "mm_optout";

export const VISITOR_MAX_AGE = 365 * 24 * 60 * 60; // 12 months
export const SESSION_MAX_AGE = 30 * 60; // rolling 30-minute inactivity window
export const OPTOUT_MAX_AGE = 2 * 365 * 24 * 60 * 60;

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * SameSite=Lax is a requirement, not a preference. Under Strict a visitor
 * arriving from Instagram or Google does not send the cookie on that first
 * cross-site navigation, so we would mint a fresh id and overwrite the real
 * one — every returning visitor from an external link would count as new,
 * which is most of the traffic for a D2C brand.
 *
 * HttpOnly is deliberate: the browser sends both automatically, the frontend
 * never reads them, and there is no XSS surface. It also sidesteps Safari's
 * ITP cap, which applies to JavaScript-set first-party cookies but not to
 * server-set ones.
 *
 * No `domain`: everything here is one origin, so host-only cookies are correct
 * and sendBeacon (which cannot set `credentials`) just works.
 */
export const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

/**
 * Insert the visitor, or bump last_seen_at if the row already exists.
 *
 * Fire-and-forget by design and never awaited on the request path: analytics
 * must not be able to fail or slow a page load. Called only when a cookie was
 * actually minted, so a visitor inside a live session costs zero database
 * work.
 */
export function touchVisitor(id: string): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return Promise.resolve();

  return fetch(`${url}/rest/v1/analytics_visitors`, {
    method: "POST",
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      // Upsert on the primary key; return nothing.
      prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({ id, last_seen_at: new Date().toISOString() }),
  }).then(
    () => undefined,
    () => undefined,
  );
}
