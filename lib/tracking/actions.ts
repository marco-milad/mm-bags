"use server";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { firstName, maskPhone } from "@/lib/mask";
import { hitLimits, requestIp } from "@/lib/security/rate-limit";
import {
  isOrderNumber,
  isUuid,
  verifyTrackingSchema,
  type TrackingErrorCode,
  type TrackingResult,
  type VerifyTrackingInput,
} from "./schema";

export type VerifyResult =
  | { ok: true; tracking: TrackingResult }
  | { ok: false; code: TrackingErrorCode; error: string };

export async function verifyAndGetTracking(
  raw: VerifyTrackingInput,
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
  const query = admin
    .from("orders")
    .select(
      "id, order_number, status, payment_method, total, shipping_address, guest_phone, created_at, order_items (qty, snapshot_name, snapshot_image), cod_tracking (courier_name, tracking_number, estimated_delivery, current_status)",
    );

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

  // Extract phone for verification: prefer shipping_address.phone, fall back to guest_phone.
  type Addr = {
    phone?: string;
    name?: string;
    governorate?: string;
    city?: string;
  };
  const addr = (order.shipping_address ?? {}) as Addr;
  const storedPhone = (addr.phone ?? order.guest_phone ?? "").replace(/\D/g, "");
  const last4 = storedPhone.slice(-4);

  if (last4 !== phoneLast4) {
    // Identical to the not-found branch above — never reveal which failed.
    return {
      ok: false,
      code: "NOT_FOUND",
      error: "البيانات مش متطابقة. تأكد من رقم الطلب والموبايل.",
    };
  }

  const codRow = Array.isArray(order.cod_tracking)
    ? order.cod_tracking[0]
    : order.cod_tracking;

  const tracking: TrackingResult = {
    orderNumber: order.order_number,
    status: order.status as TrackingResult["status"],
    paymentMethod: order.payment_method as "card" | "cod",
    total: order.total,
    createdAt: order.created_at,
    estimatedDelivery: codRow?.estimated_delivery ?? null,
    // First name only: the last-4 check is a weak credential (anyone who
    // saw the order number + those digits passes it), so never hand back
    // the full name on the strength of it.
    recipientName: firstName(addr.name),
    recipientPhone: maskPhone(storedPhone),
    governorate: addr.governorate ?? "",
    city: addr.city ?? "",
    courierName: codRow?.courier_name ?? null,
    trackingNumber: codRow?.tracking_number ?? null,
    items: (order.order_items ?? []).map((item) => ({
      name: item.snapshot_name ?? "",
      qty: item.qty,
      image: item.snapshot_image ?? null,
    })),
  };

  return { ok: true, tracking };
}
