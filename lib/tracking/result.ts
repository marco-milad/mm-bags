import { firstName, maskPhone } from "@/lib/mask";
import {
  awaitingConfirmation,
  confirmDeadline,
  formatDeadline,
} from "@/lib/orders/confirm-window";
import type { OrderStatus, PaymentMethod, PaymentStatus } from "@/lib/supabase/types";
import type { TrackingResult } from "./schema";

/** Columns both the /track lookup and the private order link read. */
export const TRACKING_ORDER_COLUMNS =
  "id, order_number, status, payment_method, payment_status, subtotal, discount_amount, coupon_code, shipping_fee, total, shipping_address, guest_phone, created_at, order_items (qty, unit_price, snapshot_name, snapshot_image), cod_tracking (courier_name, tracking_number, estimated_delivery, current_status)";

type CodRow = {
  courier_name: string | null;
  tracking_number: string | null;
  estimated_delivery: string | null;
};

export type TrackingOrderRow = {
  order_number: string;
  status: OrderStatus | null;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus | null;
  subtotal: number;
  discount_amount: number | null;
  coupon_code: string | null;
  shipping_fee: number | null;
  total: number;
  shipping_address: unknown;
  guest_phone: string | null;
  created_at: string;
  order_items:
    | { qty: number; unit_price: number; snapshot_name: string | null; snapshot_image: string | null }[]
    | null;
  cod_tracking: CodRow | CodRow[] | null;
};

type Addr = {
  phone?: string;
  name?: string;
  governorate?: string;
  city?: string;
  street?: string;
  building?: string | null;
};

/** Digits of the phone the order was placed with (the /track credential). */
export function orderPhoneDigits(order: Pick<TrackingOrderRow, "shipping_address" | "guest_phone">): string {
  const addr = (order.shipping_address ?? {}) as Addr;
  return (addr.phone ?? order.guest_phone ?? "").replace(/\D/g, "");
}

/**
 * The customer-facing view of an order. `full` is only for the private
 * order link: it adds the full name, street and price breakdown. The phone
 * stays masked either way, in case a link is forwarded.
 */
export function buildTrackingResult(
  order: TrackingOrderRow,
  { full, locale, now }: { full: boolean; locale: string; now: number },
): TrackingResult {
  const addr = (order.shipping_address ?? {}) as Addr;
  const codRow = Array.isArray(order.cod_tracking) ? order.cod_tracking[0] : order.cod_tracking;
  const status = (order.status ?? "pending") as TrackingResult["status"];

  const deadline = confirmDeadline(order.created_at);
  const confirmation = awaitingConfirmation(order)
    ? { byLabel: formatDeadline(deadline, locale), overdue: now >= deadline.getTime() }
    : null;

  return {
    orderNumber: order.order_number,
    status,
    paymentMethod: order.payment_method as TrackingResult["paymentMethod"],
    total: order.total,
    createdAt: order.created_at,
    estimatedDelivery: codRow?.estimated_delivery ?? null,
    // First name only after the last-4 check: it is a weak credential
    // (anyone who saw the order number + those digits passes it).
    recipientName: full ? (addr.name ?? "").trim() : firstName(addr.name),
    recipientPhone: maskPhone(orderPhoneDigits(order)),
    governorate: addr.governorate ?? "",
    city: addr.city ?? "",
    courierName: codRow?.courier_name ?? null,
    trackingNumber: codRow?.tracking_number ?? null,
    items: (order.order_items ?? []).map((item) => ({
      name: item.snapshot_name ?? "",
      qty: item.qty,
      image: item.snapshot_image ?? null,
      ...(full ? { unitPrice: Number(item.unit_price) } : {}),
    })),
    confirmation,
    ...(full
      ? {
          details: {
            street: addr.street ?? "",
            building: addr.building ?? null,
            subtotal: Number(order.subtotal),
            discount: Number(order.discount_amount ?? 0),
            couponCode: order.coupon_code,
            shippingFee: Number(order.shipping_fee ?? 0),
            paymentMethod: order.payment_method,
          },
        }
      : {}),
  };
}
