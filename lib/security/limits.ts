/**
 * Rate-limit budgets for public entry points, and the pure helpers that
 * build their keys. No I/O here — see rate-limit.ts for the limiter itself.
 * Tested in __tests__/limits.test.ts.
 *
 * Numbers are sized for a small store: generous for a real shopper (who
 * places 1–2 orders a day), tight enough that a script can't flood fake COD
 * orders, brute-force the /track last-4-digits check (10,000 combinations),
 * or burn the email/WhatsApp quotas.
 */
export const LIMITS = {
  /** Orders from one network. Shared NAT (mobile carriers) is why this isn't lower. */
  orderPerIp: { max: 8, windowSeconds: 60 * 60 },
  /** Orders for one phone number per day — fake-COD spam usually reuses numbers. */
  orderPerPhone: { max: 4, windowSeconds: 24 * 60 * 60 },
  /** /track lookups from one network. */
  trackPerIp: { max: 30, windowSeconds: 15 * 60 },
  /** Guesses against one order: 8 per 15 min → 10,000 last-4 guesses take ~13 days. */
  trackPerOrder: { max: 8, windowSeconds: 15 * 60 },
  contactPerIp: { max: 5, windowSeconds: 60 * 60 },
  newsletterPerIp: { max: 5, windowSeconds: 60 * 60 },
  newsletterPerEmail: { max: 3, windowSeconds: 24 * 60 * 60 },
  restockPerIp: { max: 10, windowSeconds: 60 * 60 },
  reviewPerIp: { max: 5, windowSeconds: 60 * 60 },
  /** Coupon look-ups: a shopper tries one or two codes; 10/hour stops guessing. */
  couponPerIp: { max: 10, windowSeconds: 60 * 60 },
} as const;

export type LimitName = keyof typeof LIMITS;

/** Keeps digits only and the last 10 (so +20 1x… and 01x… match). */
export function normalizePhone(raw: string | null | undefined): string {
  const digits = (raw ?? "").replace(/\D/g, "");
  return digits.slice(-10);
}

/** "<limit>:<identity>" — identity trimmed/lower-cased and capped in length. */
export function limitKey(name: LimitName, identity: string): string {
  const id = identity.trim().toLowerCase().slice(0, 150) || "unknown";
  return `${name}:${id}`;
}

/**
 * Loopback = a request from this machine (local `next start`, the e2e
 * suite). Never seen in production, where the edge sets the client IP.
 */
export function isLoopbackIp(ip: string): boolean {
  const v = ip.trim().toLowerCase();
  return v === "::1" || v === "127.0.0.1" || v === "::ffff:127.0.0.1" || v === "localhost";
}

/** Prefer the edge-set x-real-ip; fall back to the first x-forwarded-for hop. */
export function pickClientIp(realIp: string | null, forwardedFor: string | null): string {
  const real = realIp?.trim();
  if (real) return real;
  const first = forwardedFor?.split(",")[0]?.trim();
  return first || "unknown";
}

/** Shopper-facing message when a limit is hit. */
export function tooManyText(isAr: boolean): string {
  return isAr
    ? "طلبات كتير في وقت قصير. استنى شوية وجرّب تاني."
    : "Too many attempts in a short time. Please wait a bit and try again.";
}
