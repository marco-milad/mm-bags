import { createHmac, timingSafeEqual } from "node:crypto";

// Pure helpers for "is this browser / user the one who placed the order?"
// (L1). placeOrder records each new order id in an httpOnly cookie; the
// order-confirmation page only shows full contact details to the owner.
// No server-only imports — unit-tested in __tests__/ownership.test.ts.
// Server-side only in practice (node:crypto + a server secret).

export const ORDER_OWNER_COOKIE = "mm_orders";
/** Each recorded order stays claimable from this browser for 7 days. */
export const ORDER_OWNER_TTL_SECONDS = 60 * 60 * 24 * 7;
/** Keeps the cookie small (~10 × 64 bytes) for frequent buyers. */
export const ORDER_OWNER_MAX_ENTRIES = 10;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SIG_LENGTH = 22; // base64url chars ≈ 132 bits of HMAC-SHA256

export type OwnedOrderEntry = { id: string; at: number };

/**
 * Signing key for the cookie. The order URL alone must not be enough to
 * claim ownership, so entries are HMAC-signed — a hand-written cookie
 * holding someone else's order id is rejected. ORDER_COOKIE_SECRET is
 * optional; the service-role key (always set server-side) is the fallback,
 * domain-separated inside sign() so the raw key is never exposed.
 */
export function orderCookieSecret(): string | null {
  return (
    process.env.ORDER_COOKIE_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    null
  );
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(`mm_orders:v1\n${payload}`)
    .digest("base64url")
    .slice(0, SIG_LENGTH);
}

function sigMatches(payload: string, sig: string, secret: string): boolean {
  const expected = Buffer.from(sign(payload, secret));
  const given = Buffer.from(sig);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

// Cookie format: "<uuid>~<epochSeconds>~<sig>" entries joined by ".",
// newest first. The per-entry timestamp gives every order its own 7-day
// window, even though re-setting the cookie refreshes its browser expiry.
// Malformed, unsigned, forged and expired entries are silently dropped.
export function parseOwnedOrders(
  raw: string | null | undefined,
  nowSeconds: number,
  secret: string,
): OwnedOrderEntry[] {
  if (!raw || !secret) return [];
  const out: OwnedOrderEntry[] = [];
  for (const part of raw.split(".")) {
    const [rawId, at, sig, ...rest] = part.split("~");
    if (rest.length || !rawId || !at || !sig) continue;
    const id = rawId.toLowerCase();
    if (!UUID_RE.test(id) || !/^\d{1,12}$/.test(at)) continue;
    const ts = Number(at);
    // Future timestamps are as suspicious as stale ones.
    if (ts > nowSeconds + 60 || nowSeconds - ts > ORDER_OWNER_TTL_SECONDS) continue;
    if (!sigMatches(`${id}~${at}`, sig, secret)) continue;
    if (out.some((e) => e.id === id)) continue;
    out.push({ id, at: ts });
    if (out.length >= ORDER_OWNER_MAX_ENTRIES) break;
  }
  return out;
}

/** New cookie value with `orderId` prepended (deduped, expired dropped, capped). */
export function addOwnedOrder(
  raw: string | null | undefined,
  orderId: string,
  nowSeconds: number,
  secret: string,
): string {
  const id = orderId.toLowerCase();
  const at = Math.floor(nowSeconds);
  const kept = parseOwnedOrders(raw, nowSeconds, secret).filter((e) => e.id !== id);
  return [{ id, at }, ...kept]
    .slice(0, ORDER_OWNER_MAX_ENTRIES)
    .map((e) => {
      const payload = `${e.id}~${e.at}`;
      return `${payload}~${sign(payload, secret)}`;
    })
    .join(".");
}

/**
 * Owner = this browser placed the order (signed cookie) OR the signed-in
 * user is the order's account holder. Guest orders (orderUserId null) can
 * only be claimed through the cookie.
 */
export function isOrderOwner(args: {
  orderId: string;
  orderUserId: string | null | undefined;
  ownedOrderIds: readonly string[];
  viewerUserId: string | null | undefined;
}): boolean {
  const id = args.orderId.toLowerCase();
  if (args.ownedOrderIds.some((o) => o.toLowerCase() === id)) return true;
  return (
    !!args.viewerUserId &&
    !!args.orderUserId &&
    args.viewerUserId === args.orderUserId
  );
}
