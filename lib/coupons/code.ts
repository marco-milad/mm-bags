/**
 * Subscriber coupons — pure helpers (no I/O), shared by checkout, the
 * admin and tests. A coupon is personal (one per approved subscriber),
 * single-use and time-limited; the server is the only authority on whether
 * a code is usable (lib/coupons/server.ts).
 */

/** No 0/O, 1/I: codes get read out over the phone and typed on mobiles. */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const BODY_LENGTH = 6;
const CODE_RE = new RegExp(`^MM-[${ALPHABET}]{${BODY_LENGTH}}$`);

/** The newsletter offer: 10% off the products on the first order. */
export const SUBSCRIBER_PERCENT_OFF = 10;
export const COUPON_VALID_DAYS = 60;
/** Codes are short; anything longer than this is not a code. */
export const COUPON_INPUT_MAX = 20;

/** "MM-" + 6 random characters (32^6 ≈ 1.07 billion combinations). */
export function generateCouponCode(
  randomBytes: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n)),
): string {
  // 256 is a multiple of 32, so `byte % 32` has no modulo bias.
  const bytes = randomBytes(BODY_LENGTH);
  let body = "";
  for (let i = 0; i < BODY_LENGTH; i++) body += ALPHABET[bytes[i] % ALPHABET.length];
  return `MM-${body}`;
}

/**
 * Canonical form of what a shopper typed, or null if it can't be a code.
 * Forgiving: lower case, spaces, a missing or extra dash ("mm abc234",
 * "MMABC234", "mm–abc234") all become "MM-ABC234".
 */
export function normalizeCouponCode(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length > COUPON_INPUT_MAX) return null;
  const compact = raw.toUpperCase().replace(/[\s\-–—_]/g, "");
  if (!compact.startsWith("MM")) return null;
  const code = `MM-${compact.slice(2)}`;
  return CODE_RE.test(code) ? code : null;
}

/** Discount in whole pounds on the products subtotal, never more than it. */
export function couponDiscount(subtotal: number, percentOff: number): number {
  if (!(subtotal > 0) || !(percentOff > 0)) return 0;
  const pct = Math.min(percentOff, 100);
  return Math.min(subtotal, Math.round((subtotal * pct) / 100));
}

/** Expiry for a code issued at `from`. */
export function couponExpiry(from: Date = new Date()): Date {
  return new Date(from.getTime() + COUPON_VALID_DAYS * 24 * 60 * 60 * 1000);
}

export type CouponRejection = "invalid" | "used" | "expired";

/** Shopper-facing reason a code was refused. */
export function couponRejectionText(reason: CouponRejection | "rate_limited", isAr: boolean): string {
  switch (reason) {
    case "used":
      return isAr ? "الكود ده اتستخدم قبل كده." : "This code has already been used.";
    case "expired":
      return isAr ? "الكود ده انتهت صلاحيته." : "This code has expired.";
    case "rate_limited":
      return isAr
        ? "محاولات كتير في وقت قصير. استنى شوية وجرّب تاني."
        : "Too many attempts in a short time. Please wait a bit and try again.";
    default:
      return isAr ? "الكود ده مش صحيح." : "This code isn't valid.";
  }
}
