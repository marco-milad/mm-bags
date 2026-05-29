"use server";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  isOrderNumber,
  isUuid,
  verifyTrackingSchema,
  type TrackingResult,
  type VerifyTrackingInput,
} from "./schema";

export type VerifyResult =
  | { ok: true; tracking: TrackingResult }
  | { ok: false; error: string };

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return phone;
  return `${"•".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}

export async function verifyAndGetTracking(
  raw: VerifyTrackingInput,
): Promise<VerifyResult> {
  const parsed = verifyTrackingSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };
  }
  const { orderIdOrNumber, phoneLast4 } = parsed.data;

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
    return { ok: false, error: "رقم الطلب غير صحيح" };
  }

  const { data: order, error } = await query.maybeSingle();
  if (error || !order) {
    // Same message whether the order doesn't exist or phone is wrong, so
    // attackers can't enumerate orders by guessing IDs.
    return { ok: false, error: "البيانات مش متطابقة. تأكد من رقم الطلب والموبايل." };
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
    return { ok: false, error: "البيانات مش متطابقة. تأكد من رقم الطلب والموبايل." };
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
    recipientName: addr.name ?? "",
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
