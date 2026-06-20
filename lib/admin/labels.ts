import type { AdminLocale } from "./locale";

/**
 * Translation tables for admin-side enum values (order status, payment
 * method, etc.). Kept as plain dictionaries — no React, no `server-only`
 * — so the same maps can be used from both server and client components.
 *
 * Adding a value: add it to BOTH the `ar` and `en` records. The lookup
 * helpers fall back to the raw key if a translation is missing so a
 * forgotten entry surfaces as the literal database value instead of
 * crashing.
 */

const ORDER_STATUS_LABELS = {
  ar: {
    pending: "في الانتظار",
    confirmed: "مؤكد",
    processing: "جاري التجهيز",
    shipped: "تم الشحن",
    out_for_delivery: "في الطريق",
    delivered: "تم التسليم",
    cancelled: "ملغي",
  } as Record<string, string>,
  en: {
    pending: "Pending",
    confirmed: "Confirmed",
    processing: "Processing",
    shipped: "Shipped",
    out_for_delivery: "Out for delivery",
    delivered: "Delivered",
    cancelled: "Cancelled",
  } as Record<string, string>,
} as const;

const PAYMENT_METHOD_LABELS = {
  ar: {
    cash: "نقدي",
    card: "بطاقة",
    cod: "الدفع عند الاستلام",
    instapay: "انستا باي",
    "e-wallet": "محفظة إلكترونية",
  } as Record<string, string>,
  en: {
    cash: "Cash",
    card: "Card",
    cod: "Cash on delivery",
    instapay: "Instapay",
    "e-wallet": "E-wallet",
  } as Record<string, string>,
} as const;

const PAYMENT_STATUS_LABELS = {
  ar: {
    pending: "في الانتظار",
    paid: "مدفوع",
    failed: "فشل",
    refunded: "تم الاسترداد",
  } as Record<string, string>,
  en: {
    pending: "Pending",
    paid: "Paid",
    failed: "Failed",
    refunded: "Refunded",
  } as Record<string, string>,
} as const;

export function orderStatusLabel(
  status: string | null | undefined,
  locale: AdminLocale,
): string {
  if (!status) return ORDER_STATUS_LABELS[locale].pending ?? "—";
  return ORDER_STATUS_LABELS[locale][status] ?? status.replace(/_/g, " ");
}

export function paymentMethodLabel(
  method: string | null | undefined,
  locale: AdminLocale,
): string {
  if (!method) return "—";
  return PAYMENT_METHOD_LABELS[locale][method] ?? method;
}

export function paymentStatusLabel(
  status: string | null | undefined,
  locale: AdminLocale,
): string {
  if (!status) return PAYMENT_STATUS_LABELS[locale].pending ?? "—";
  return PAYMENT_STATUS_LABELS[locale][status] ?? status;
}

/** Convenience: ordered list of valid order statuses (for dropdowns). */
export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const;

// ─── Returns ────────────────────────────────────────────────────────
// Egyptian phrasing mirrors the /[locale]/refund-policy page so the
// admin labels match the public commitment the customer reads.

const RETURN_REASON_LABELS = {
  ar: {
    defective: "عيب تصنيع",
    wrong_size: "مقاس مختلف",
    wrong_color: "لون مختلف",
    changed_mind: "غيّر رأيه",
    damaged_in_shipping: "وصل تالف",
    other: "سبب آخر",
  } as Record<string, string>,
  en: {
    defective: "Manufacturing defect",
    wrong_size: "Wrong size",
    wrong_color: "Wrong colour",
    changed_mind: "Changed mind",
    damaged_in_shipping: "Damaged in shipping",
    other: "Other",
  } as Record<string, string>,
} as const;

const REFUND_METHOD_LABELS = {
  ar: {
    cash: "كاش",
    card_original: "نفس الكارت الأصلي",
    store_credit: "رصيد محل",
    bank_transfer: "تحويل بنكي",
  } as Record<string, string>,
  en: {
    cash: "Cash",
    card_original: "Original card",
    store_credit: "Store credit",
    bank_transfer: "Bank transfer",
  } as Record<string, string>,
} as const;

export function returnReasonLabel(
  reason: string | null | undefined,
  locale: AdminLocale,
): string {
  if (!reason) return "—";
  return RETURN_REASON_LABELS[locale][reason] ?? reason.replace(/_/g, " ");
}

export function refundMethodLabel(
  method: string | null | undefined,
  locale: AdminLocale,
): string {
  if (!method) return "—";
  return REFUND_METHOD_LABELS[locale][method] ?? method;
}
