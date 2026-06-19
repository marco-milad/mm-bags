import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { cairoDayStartISO } from "./cairo-tz";
import type {
  CodTracking,
  Order,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from "@/lib/supabase/types";

/**
 * Admin order queries.
 *
 * Shape decisions:
 *   - The list view shows a denormalised customer name + phone pulled
 *     from `shipping_address` (jsonb) so we don't have to chase a
 *     users-table join for guests.
 *   - The detail view returns the order + line items + COD tracking
 *     row in one Promise.all.
 */

type ShippingAddressShape = {
  name?: string;
  phone?: string;
  email?: string | null;
  governorate?: string;
  city?: string;
  street?: string;
  building?: string | null;
  notes?: string | null;
};

export type AdminOrderRow = Pick<
  Order,
  | "id"
  | "order_number"
  | "status"
  | "payment_method"
  | "total"
  | "created_at"
> & {
  // payment_status is nullable in our DB even though the generated
  // Order type marks it required — override to nullable here.
  payment_status: PaymentStatus | null;
  customer_name: string;
  customer_phone: string;
  item_count: number;
};

export type ListOrderFilters = {
  status?: OrderStatus;
  paymentMethod?: PaymentMethod;
  from?: string; // ISO date
  to?: string; // ISO date exclusive
  q?: string; // matches order_number or shipping_address.phone (we filter client-side after fetch for phone since it's in jsonb)
};

export async function listAdminOrders(
  filters: ListOrderFilters = {},
): Promise<AdminOrderRow[]> {
  const admin = getSupabaseAdminClient();
  let q = admin
    .from("orders")
    .select(
      "id, order_number, status, payment_method, payment_status, total, created_at, shipping_address, " +
      "items:order_items(id)",
    )
    .order("created_at", { ascending: false })
    .limit(500);

  if (filters.status) q = q.eq("status", filters.status);
  if (filters.paymentMethod) q = q.eq("payment_method", filters.paymentMethod);
  // Cairo-aligned bounds — an operator filtering "from 2026-06-18"
  // expects every sale rung up after Cairo midnight that day, including
  // the 22:00–24:00 Cairo June 17 tail that the old UTC literal missed.
  if (filters.from) q = q.gte("created_at", cairoDayStartISO(filters.from));
  if (filters.to) q = q.lt("created_at", cairoDayStartISO(filters.to));

  // order_number filter — exact-ish ilike since the user typically
  // remembers part of the trailing token.
  if (filters.q?.trim()) {
    const safe = filters.q.trim().replace(/[*,()]/g, " ");
    q = q.ilike("order_number", `%${safe}%`);
  }

  const { data } = await q;
  const raw = (data ?? []) as unknown as Array<{
    id: string;
    order_number: string;
    status: OrderStatus | null;
    payment_method: PaymentMethod;
    payment_status: PaymentStatus | null;
    total: number;
    created_at: string;
    shipping_address: ShippingAddressShape | null;
    items: Array<{ id: string }> | null;
  }>;

  let rows: AdminOrderRow[] = raw.map((r) => {
    const address = r.shipping_address ?? {};
    return {
      id: r.id,
      order_number: r.order_number,
      status: r.status ?? "pending",
      payment_method: r.payment_method,
      payment_status: r.payment_status,
      total: r.total,
      created_at: r.created_at,
      customer_name: address.name ?? "(guest)",
      customer_phone: address.phone ?? "—",
      item_count: r.items?.length ?? 0,
    };
  });

  // Secondary phone search — order_number filter already ran on the DB
  // side, so this only kicks in if the query string DIDN'T match any
  // order_number. We re-fetch in that case so the user always gets
  // hits when they typed a phone number.
  if (filters.q?.trim() && rows.length === 0) {
    const safe = filters.q.trim().replace(/[%_]/g, "");
    const { data: byPhone } = await admin
      .from("orders")
      .select(
        "id, order_number, status, payment_method, payment_status, total, created_at, shipping_address, " +
        "items:order_items(id)",
      )
      .ilike("guest_phone", `%${safe}%`)
      .order("created_at", { ascending: false })
      .limit(200);
    const phoneRaw = (byPhone ?? []) as unknown as typeof raw;
    rows = phoneRaw.map((r) => {
      const address = r.shipping_address ?? {};
      return {
        id: r.id,
        order_number: r.order_number,
        status: r.status ?? "pending",
        payment_method: r.payment_method,
        payment_status: r.payment_status,
        total: r.total,
        created_at: r.created_at,
        customer_name: address.name ?? "(guest)",
        customer_phone: address.phone ?? "—",
        item_count: r.items?.length ?? 0,
      };
    });
  }

  return rows;
}

// ─── Detail ──────────────────────────────────────────────────────────
export type AdminOrderDetail = Order & {
  items: Array<{
    id: string;
    qty: number;
    unit_price: number;
    snapshot_name: string | null;
    snapshot_image: string | null;
    product_id: string | null;
    variant_id: string | null;
    product_slug: string | null;
    product_name: string | null;
    variant_label: string | null;
  }>;
  cod_tracking: CodTracking | null;
  customer: ShippingAddressShape;
};

export async function getAdminOrderDetail(
  id: string,
): Promise<AdminOrderDetail | null> {
  const admin = getSupabaseAdminClient();
  const [orderRes, codRes] = await Promise.all([
    admin
      .from("orders")
      .select(
        "*, items:order_items(id, qty, unit_price, snapshot_name, snapshot_image, " +
        "product_id, variant_id, " +
        "product:products(name_ar, name_en, slug), " +
        "variant:product_variants(color_ar, color_en, size_inches, size_label_ar))",
      )
      .eq("id", id)
      .maybeSingle(),
    admin
      .from("cod_tracking")
      .select("*")
      .eq("order_id", id)
      .maybeSingle(),
  ]);

  if (!orderRes.data) return null;

  const rawOrder = orderRes.data as unknown as Order & {
    items: Array<{
      id: string;
      qty: number;
      unit_price: number;
      snapshot_name: string | null;
      snapshot_image: string | null;
      product_id: string | null;
      variant_id: string | null;
      product:
        | { name_ar: string; name_en: string; slug: string }
        | Array<{ name_ar: string; name_en: string; slug: string }>
        | null;
      variant:
        | {
            color_ar: string | null;
            color_en: string | null;
            size_inches: number | null;
            size_label_ar: string | null;
          }
        | Array<{
            color_ar: string | null;
            color_en: string | null;
            size_inches: number | null;
            size_label_ar: string | null;
          }>
        | null;
    }> | null;
    shipping_address: ShippingAddressShape | null;
  };

  const items = (rawOrder.items ?? []).map((it) => {
    const product = Array.isArray(it.product) ? it.product[0] : it.product;
    const variant = Array.isArray(it.variant) ? it.variant[0] : it.variant;
    const variantLabel = variant
      ? [
          variant.color_ar ?? variant.color_en,
          variant.size_inches
            ? `${variant.size_inches}"`
            : variant.size_label_ar,
        ]
          .filter(Boolean)
          .join(" · ")
      : null;
    return {
      id: it.id,
      qty: it.qty,
      unit_price: it.unit_price,
      snapshot_name: it.snapshot_name,
      snapshot_image: it.snapshot_image,
      product_id: it.product_id,
      variant_id: it.variant_id,
      product_slug: product?.slug ?? null,
      product_name: product?.name_ar ?? product?.name_en ?? null,
      variant_label: variantLabel || null,
    };
  });

  return {
    ...(rawOrder as Order),
    items,
    cod_tracking: (codRes.data as CodTracking | null) ?? null,
    customer: rawOrder.shipping_address ?? {},
  };
}
