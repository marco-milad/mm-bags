import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { CouponRejection } from "./code";

export type UsableCoupon = { code: string; percentOff: number };

/**
 * Read-only check: is `code` (already normalised) redeemable right now?
 * Used for the checkout preview and before pricing an order. It does NOT
 * reserve anything — claimCoupon() is the atomic step.
 */
export async function findUsableCoupon(
  code: string,
): Promise<{ ok: true; coupon: UsableCoupon } | { ok: false; reason: CouponRejection }> {
  const { data, error } = await getSupabaseAdminClient()
    .from("coupons")
    .select("code, percent_off, used_at, expires_at")
    .eq("code", code)
    .maybeSingle();
  if (error || !data) return { ok: false, reason: "invalid" };
  if (data.used_at) return { ok: false, reason: "used" };
  if (data.expires_at && Date.parse(data.expires_at) <= Date.now()) return { ok: false, reason: "expired" };
  return { ok: true, coupon: { code: data.code, percentOff: data.percent_off } };
}

/**
 * Redeems `code` for `orderId` in ONE conditional UPDATE: it only matches
 * while the code is unused and unexpired, so of two orders racing for the
 * same code exactly one gets a row back. Returns false for the loser.
 */
export async function claimCoupon(code: string, orderId: string): Promise<boolean> {
  const now = new Date().toISOString();
  const { data, error } = await getSupabaseAdminClient()
    .from("coupons")
    .update({ used_at: now, order_id: orderId })
    .eq("code", code)
    .is("used_at", null)
    // Quoted: the ISO timestamp's "." and ":" must not be parsed as syntax.
    .or(`expires_at.is.null,expires_at.gt."${now}"`)
    .select("id");
  return !error && (data?.length ?? 0) === 1;
}

/** Gives the code back when the order it was claimed for is rolled back. */
export async function releaseCoupon(orderId: string): Promise<void> {
  const { error } = await getSupabaseAdminClient()
    .from("coupons")
    .update({ used_at: null, order_id: null })
    .eq("order_id", orderId);
  if (error) console.error("[coupons] release failed for order", orderId, error.message);
}
