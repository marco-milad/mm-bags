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

export function totalStock(product: ProductWithVariants): number {
  if (!product.product_variants.length) return 0;
  return product.product_variants.reduce((sum, v) => sum + (v.stock_qty ?? 0), 0);
}
