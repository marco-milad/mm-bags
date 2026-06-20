import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Server queries for the POS-returns admin screen.
 *
 * Two surfaces:
 *   - `findPosSalesForReturn(query)` — typeahead search the cashier
 *     uses to locate the original sale. Matches against `sale_number`
 *     (ilike) primarily; we don't try guest-phone lookups because
 *     POS sales don't carry a phone field on `pos_sales`.
 *   - `getReturnableQuantitiesForPosSale(saleId)` — once a sale is
 *     picked, return the full breakdown of line items + how many
 *     units are still returnable (sold − already-returned).
 */

export type PosSaleSearchResult = {
  id: string;
  saleNumber: string;
  createdAt: string;
  total: number;
  paymentMethod: string;
  returnsTotal: number;
  hasReturns: boolean;
};

/**
 * Searches by sale_number (ilike). Returns up to 10 most-recent.
 *
 * The brief mentions searching by "order phone" as a fallback —
 * `pos_sales` doesn't have a customer-phone column today (POS is
 * walk-in, no contact details captured), so we omit that branch.
 * If a phone-attached POS schema lands later this is the place to
 * add the second pass mirroring `listAdminOrders`'s fallback.
 */
export async function findPosSalesForReturn(
  query: string,
): Promise<PosSaleSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const admin = getSupabaseAdminClient();
  // Strip wildcard / parenthesis chars so a stray "%" from a paste
  // doesn't turn into an ilike escape sequence.
  const safe = trimmed.replace(/[*,()%_]/g, " ");

  const { data, error } = await admin
    .from("pos_sales")
    .select(
      "id, sale_number, created_at, total, payment_method, returns_total, has_returns",
    )
    .ilike("sale_number", `%${safe}%`)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    throw new Error(`findPosSalesForReturn failed: ${error.message}`);
  }
  return (data ?? []).map((r) => ({
    id: r.id,
    saleNumber: r.sale_number,
    createdAt: r.created_at,
    total: r.total,
    paymentMethod: r.payment_method,
    returnsTotal: r.returns_total ?? 0,
    hasReturns: r.has_returns ?? false,
  }));
}

export type ReturnablePosLine = {
  saleItemId: string;
  productId: string | null;
  variantId: string | null;
  productName: string;
  variantLabel: string | null;
  originalQty: number;
  returnedQty: number;
  remainingQty: number;
  unitPrice: number;
};

export async function getReturnableQuantitiesForPosSale(
  saleId: string,
): Promise<{
  sale: {
    id: string;
    saleNumber: string;
    createdAt: string;
    total: number;
    paymentMethod: string;
  };
  lines: ReturnablePosLine[];
} | null> {
  const admin = getSupabaseAdminClient();

  // Sale header — bail if it doesn't exist.
  const { data: saleRow, error: saleErr } = await admin
    .from("pos_sales")
    .select("id, sale_number, created_at, total, payment_method")
    .eq("id", saleId)
    .maybeSingle();
  if (saleErr) {
    throw new Error(
      `getReturnableQuantitiesForPosSale failed: ${saleErr.message}`,
    );
  }
  if (!saleRow) return null;

  // Items + joined product/variant for label rendering.
  const { data: itemsRaw, error: itemsErr } = await admin
    .from("pos_sale_items")
    .select(
      "id, qty, unit_price, snapshot_name, snapshot_color, snapshot_size, product_id, variant_id, " +
        "product:products(name_ar, name_en), " +
        "variant:product_variants(color_ar, color_en, size_inches, size_label_ar)",
    )
    .eq("sale_id", saleId)
    .order("id", { ascending: true });
  if (itemsErr) {
    throw new Error(
      `getReturnableQuantitiesForPosSale items failed: ${itemsErr.message}`,
    );
  }

  type RawLine = {
    id: string;
    qty: number;
    unit_price: number;
    snapshot_name: string | null;
    snapshot_color: string | null;
    snapshot_size: string | null;
    product_id: string | null;
    variant_id: string | null;
    product: { name_ar: string | null; name_en: string | null } | null;
    variant: {
      color_ar: string | null;
      color_en: string | null;
      size_inches: number | null;
      size_label_ar: string | null;
    } | null;
  };
  const items = (itemsRaw ?? []) as unknown as RawLine[];

  // Sum already-returned qty per sale_item_id.
  const saleItemIds = items.map((i) => i.id);
  let returnedByItemId = new Map<string, number>();
  if (saleItemIds.length > 0) {
    const { data: priorReturns, error: priorErr } = await admin
      .from("pos_return_items")
      .select("sale_item_id, qty")
      .in("sale_item_id", saleItemIds);
    if (priorErr) {
      throw new Error(
        `getReturnableQuantitiesForPosSale priors failed: ${priorErr.message}`,
      );
    }
    returnedByItemId = (priorReturns ?? []).reduce((acc, row) => {
      if (!row.sale_item_id) return acc;
      acc.set(row.sale_item_id, (acc.get(row.sale_item_id) ?? 0) + row.qty);
      return acc;
    }, new Map<string, number>());
  }

  const lines: ReturnablePosLine[] = items.map((it) => {
    const productName =
      it.snapshot_name ??
      it.product?.name_ar ??
      it.product?.name_en ??
      "—";

    const colorBits = [
      it.snapshot_color,
      it.variant?.color_ar ?? it.variant?.color_en,
    ].filter(Boolean) as string[];
    const sizeBits = [
      it.snapshot_size,
      it.variant?.size_label_ar,
      it.variant?.size_inches ? `${it.variant.size_inches}"` : null,
    ].filter(Boolean) as string[];
    const variantLabel =
      [colorBits[0], sizeBits[0]].filter(Boolean).join(" · ") || null;

    const returned = returnedByItemId.get(it.id) ?? 0;
    return {
      saleItemId: it.id,
      productId: it.product_id,
      variantId: it.variant_id,
      productName,
      variantLabel,
      originalQty: it.qty,
      returnedQty: returned,
      remainingQty: Math.max(0, it.qty - returned),
      unitPrice: it.unit_price,
    };
  });

  return {
    sale: {
      id: saleRow.id,
      saleNumber: saleRow.sale_number,
      createdAt: saleRow.created_at,
      total: saleRow.total,
      paymentMethod: saleRow.payment_method,
    },
    lines,
  };
}
