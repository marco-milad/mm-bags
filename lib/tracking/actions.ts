"use server";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { hitLimits, requestIp } from "@/lib/security/rate-limit";
import {
  isOrderNumber,
  isUuid,
  verifyTrackingSchema,
  type TrackingErrorCode,
  type TrackingResult,
  type VerifyTrackingInput,
} from "./schema";
import {
  TRACKING_ORDER_COLUMNS,
  buildTrackingResult,
  orderPhoneDigits,
  type TrackingOrderRow,
} from "./result";

export type VerifyResult =
  | { ok: true; tracking: TrackingResult }
  | { ok: false; code: TrackingErrorCode; error: string };

export async function verifyAndGetTracking(
  raw: VerifyTrackingInput,
  locale: string = "ar",
): Promise<VerifyResult> {
  const parsed = verifyTrackingSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة",
    };
  }
  const { orderIdOrNumber, phoneLast4 } = parsed.data;

  // The last 4 phone digits are a 10,000-combination secret: cap guesses per
  // order and per network so they can't be brute-forced (audit M4).
  const limited = await hitLimits([
    ["trackPerIp", await requestIp()],
    ["trackPerOrder", orderIdOrNumber],
  ]);
  if (!limited.ok) {
    return { ok: false, code: "RATE_LIMITED", error: "محاولات كتير. استنى شوية وجرّب تاني." };
  }

  const admin = getSupabaseAdminClient();
  const query = admin.from("orders").select(TRACKING_ORDER_COLUMNS);

  if (isUuid(orderIdOrNumber)) {
    query.eq("id", orderIdOrNumber);
  } else if (isOrderNumber(orderIdOrNumber)) {
    query.eq("order_number", orderIdOrNumber.toUpperCase());
  } else {
    return { ok: false, code: "INVALID_INPUT", error: "رقم الطلب غير صحيح" };
  }

  const { data: order, error } = await query.maybeSingle();
  if (error || !order) {
    // Same code AND message whether the order doesn't exist or the phone is
    // wrong, so attackers can't enumerate orders by guessing IDs.
    return {
      ok: false,
      code: "NOT_FOUND",
      error: "البيانات مش متطابقة. تأكد من رقم الطلب والموبايل.",
    };
  }

  // The phone digits are the shipping_address phone, falling back to guest_phone.
  const row = order as unknown as TrackingOrderRow;
  if (orderPhoneDigits(row).slice(-4) !== phoneLast4) {
    // Identical to the not-found branch above — never reveal which failed.
    return {
      ok: false,
      code: "NOT_FOUND",
      error: "البيانات مش متطابقة. تأكد من رقم الطلب والموبايل.",
    };
  }

  const tracking = buildTrackingResult(row, { full: false, locale, now: Date.now() });
  return { ok: true, tracking };
}
