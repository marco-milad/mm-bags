"use server";

import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { MAX_STOCK_LOOKUP, type VariantStock } from "./qty";

const variantIdsSchema = z.array(z.uuid()).min(1).max(MAX_STOCK_LOOKUP);

/**
 * Current stock for the variants in a shopper's cart (M6). The cart lives in
 * localStorage, so a line's stock can be days stale; the drawer / cart page
 * call this once on mount and the store clamps qty to what's actually left.
 *
 * Uses the admin (service-role) client — same pattern as
 * lib/checkout/validate-cart.ts — so a deleted variant or a deactivated
 * product is reported as stock 0 (the line shows "out of stock") rather than
 * just disappearing behind RLS. Only stock counts are returned; nothing the
 * PDP doesn't already disclose.
 *
 * Returns null on bad input or a failed read — the caller then leaves the
 * cart untouched (checkout still re-validates server-side).
 */
export async function getCartStock(
  rawIds: unknown,
): Promise<VariantStock[] | null> {
  const parsed = variantIdsSchema.safeParse(rawIds);
  if (!parsed.success) return null;
  const variantIds = Array.from(new Set(parsed.data));

  const admin = getSupabaseAdminClient();

  const { data: variants, error: variantsErr } = await admin
    .from("product_variants")
    .select("id, product_id, stock_qty")
    .in("id", variantIds);

  if (variantsErr) {
    console.error("[getCartStock] variant read failed:", variantsErr.message);
    return null;
  }

  const productIds = Array.from(
    new Set(
      (variants ?? [])
        .map((v) => v.product_id)
        .filter((id): id is string => id != null),
    ),
  );

  const activeProducts = new Set<string>();
  if (productIds.length > 0) {
    const { data: products, error: productsErr } = await admin
      .from("products")
      .select("id, is_active")
      .in("id", productIds);

    if (productsErr) {
      console.error("[getCartStock] product read failed:", productsErr.message);
      return null;
    }
    for (const p of products ?? []) {
      if (p.is_active === true) activeProducts.add(p.id);
    }
  }

  const stockById = new Map<string, number>();
  for (const v of variants ?? []) {
    const sellable = v.product_id != null && activeProducts.has(v.product_id);
    stockById.set(v.id, sellable ? Math.max(0, v.stock_qty ?? 0) : 0);
  }

  // Unknown ids (variant deleted) come back as 0 so the line is flagged.
  return variantIds.map((variantId) => ({
    variantId,
    stock: stockById.get(variantId) ?? 0,
  }));
}
