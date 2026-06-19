import type { Product, ProductVariant } from "@/lib/supabase/types";

export type CatalogSort = "featured" | "newest" | "price-asc" | "price-desc";

export const CATALOG_SORTS: readonly CatalogSort[] = [
  "featured",
  "newest",
  "price-asc",
  "price-desc",
] as const;

export function isCatalogSort(value: string | undefined): value is CatalogSort {
  return !!value && (CATALOG_SORTS as readonly string[]).includes(value);
}

export type ProductWithVariants = Product & { product_variants: ProductVariant[] };

export function effectivePrice(product: Pick<Product, "base_price" | "sale_price">): number {
  return product.sale_price ?? product.base_price;
}

/**
 * In-store (POS) price for a product, optionally narrowed to a
 * specific variant. Resolution order, most-specific first:
 *
 *   1. variant.store_price_override   — POS price for this colour/size
 *   2. product.store_price            — POS price for the whole product
 *   3. variant.price_override         — website per-variant override
 *   4. product.sale_price             — website discount
 *   5. product.base_price             — list price
 *
 * Crucially the storefront never reads (1) or (2). A POS-only quote
 * for a walk-in customer can sit on the row without ever leaking to
 * the public catalog.
 */
export function effectivePosPrice(
  product: Pick<Product, "base_price" | "sale_price" | "store_price">,
  variant?: Pick<ProductVariant, "price_override" | "store_price_override"> | null,
): number {
  if (variant?.store_price_override != null) return variant.store_price_override;
  if (product.store_price != null) return product.store_price;
  if (variant?.price_override != null) return variant.price_override;
  return product.sale_price ?? product.base_price;
}

/**
 * True when the POS price for this product/variant differs from the
 * website price by more than half a piastre. The cashier UI uses this
 * to surface a "POS price" badge so a counter quote is never read as
 * the published list price.
 */
export function hasStoreSpecificPrice(
  product: Pick<Product, "base_price" | "sale_price" | "store_price">,
  variant?: Pick<ProductVariant, "price_override" | "store_price_override"> | null,
): boolean {
  const pos = effectivePosPrice(product, variant);
  const web = variant?.price_override ?? product.sale_price ?? product.base_price;
  return Math.abs(pos - web) > 0.005;
}

export function totalStock(product: ProductWithVariants): number {
  if (!product.product_variants.length) return 0;
  return product.product_variants.reduce((sum, v) => sum + (v.stock_qty ?? 0), 0);
}
