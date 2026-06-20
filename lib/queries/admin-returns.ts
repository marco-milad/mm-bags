import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ReturnReason, RefundMethod } from "@/lib/supabase/types";

/**
 * Admin queries for the returns surface.
 *
 * getReturnableQuantitiesForOrder feeds the ReturnOrderDialog — it
 * tells the modal exactly how much of each line item is still
 * returnable (original qty minus the sum of qty already covered by
 * prior order_returns rows).
 *
 * listReturnsForOrder powers the "previous returns" section on the
 * order detail page.
 */

export type ReturnableLine = {
  orderItemId: string;
  productId: string | null;
  variantId: string | null;
  productName: string;
  variantLabel: string | null;
  originalQty: number;
  returnedQty: number;
  remainingQty: number;
  unitPrice: number;
  snapshotImage: string | null;
};

export async function getReturnableQuantitiesForOrder(
  orderId: string,
): Promise<ReturnableLine[]> {
  const admin = getSupabaseAdminClient();

  const { data: itemsRaw } = await admin
    .from("order_items")
    .select(
      "id, product_id, variant_id, qty, unit_price, snapshot_name, snapshot_image, " +
        "product:products(name_ar, name_en), " +
        "variant:product_variants(color_ar, color_en, size_inches, size_label_ar)",
    )
    .eq("order_id", orderId);

  if (!itemsRaw || itemsRaw.length === 0) return [];

  const itemIds = (itemsRaw as unknown as Array<{ id: string }>).map(
    (r) => r.id,
  );

  // Sum previously-returned qty per order_item_id.
  const { data: priorRaw } = await admin
    .from("order_return_items")
    .select("order_item_id, qty")
    .in("order_item_id", itemIds);
  const returnedMap = new Map<string, number>();
  for (const row of (priorRaw ?? []) as Array<{
    order_item_id: string | null;
    qty: number;
  }>) {
    if (!row.order_item_id) continue;
    returnedMap.set(
      row.order_item_id,
      (returnedMap.get(row.order_item_id) ?? 0) + row.qty,
    );
  }

  type Joined = {
    id: string;
    product_id: string | null;
    variant_id: string | null;
    qty: number;
    unit_price: number;
    snapshot_name: string | null;
    snapshot_image: string | null;
    product:
      | { name_ar: string; name_en: string }
      | Array<{ name_ar: string; name_en: string }>
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
  };

  return (itemsRaw as unknown as Joined[]).map((it) => {
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
          .join(" · ") || null
      : null;
    const returnedQty = returnedMap.get(it.id) ?? 0;
    const remainingQty = Math.max(0, it.qty - returnedQty);
    return {
      orderItemId: it.id,
      productId: it.product_id,
      variantId: it.variant_id,
      productName:
        product?.name_ar ?? product?.name_en ?? it.snapshot_name ?? "—",
      variantLabel,
      originalQty: it.qty,
      returnedQty,
      remainingQty,
      unitPrice: it.unit_price,
      snapshotImage: it.snapshot_image,
    };
  });
}

export type OrderReturnSummary = {
  id: string;
  createdAt: string;
  reason: ReturnReason;
  refundMethod: RefundMethod;
  refundAmount: number;
  notes: string | null;
  itemCount: number;
};

export async function listReturnsForOrder(
  orderId: string,
): Promise<OrderReturnSummary[]> {
  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from("order_returns")
    .select(
      "id, created_at, reason, refund_method, refund_amount, notes, " +
        "items:order_return_items(id)",
    )
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });

  type Row = {
    id: string;
    created_at: string;
    reason: ReturnReason;
    refund_method: RefundMethod;
    refund_amount: number;
    notes: string | null;
    items: Array<{ id: string }> | null;
  };

  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    reason: r.reason,
    refundMethod: r.refund_method,
    refundAmount: Number(r.refund_amount),
    notes: r.notes,
    itemCount: r.items?.length ?? 0,
  }));
}
