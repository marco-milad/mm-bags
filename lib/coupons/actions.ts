"use server";

import { hitLimit, requestIp } from "@/lib/security/rate-limit";
import { normalizeCouponCode, type CouponRejection } from "./code";
import { findUsableCoupon } from "./server";

export type CheckCouponResult =
  | { ok: true; code: string; percentOff: number }
  | { ok: false; reason: CouponRejection | "rate_limited" };

/**
 * Checkout preview: "does this code work?" Rate-limited per network so the
 * code space can't be brute-forced. placeOrder re-validates and redeems.
 */
export async function checkCoupon(raw: unknown): Promise<CheckCouponResult> {
  const limited = await hitLimit("couponPerIp", await requestIp());
  if (!limited.ok) return { ok: false, reason: "rate_limited" };
  const code = normalizeCouponCode(raw);
  if (!code) return { ok: false, reason: "invalid" };
  const found = await findUsableCoupon(code);
  return found.ok
    ? { ok: true, code: found.coupon.code, percentOff: found.coupon.percentOff }
    : { ok: false, reason: found.reason };
}
