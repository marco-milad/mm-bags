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

/**
 * The subset of product data a catalog card actually renders. This is
 * what the paginated catalog query selects (instead of `*`), and it is
 * the prop type of ProductCard / QuickView so TypeScript enforces the
 * contract in both directions. A full ProductWithVariants satisfies it
 * structurally, so existing callers (carousels, related products) keep
 * passing full rows unchanged.
 */
export type CatalogCardVariant = Pick<
  ProductVariant,
  | "id"
  | "color_hex"
  | "color_ar"
  | "color_en"
  | "size_inches"
  | "stock_qty"
  | "price_override"
>;

export type CatalogCardProduct = Pick<
  Product,
  | "id"
  | "slug"
  | "name_ar"
  | "name_en"
  | "base_price"
  | "sale_price"
  | "images"
  | "image_fit"
  | "material_type"
  | "dimensions"
  | "weight_kg"
  | "laptop_inches"
  | "capacity_liters"
  | "wheel_type"
  | "lock_type"
  | "is_water_resistant"
  | "is_expandable"
> & { product_variants: CatalogCardVariant[] };

/** Products per catalog page ("Load more" step). */
export const CATALOG_PAGE_SIZE = 24;

/**
 * Trim a full product row to exactly what a catalog card (and the
 * client components inside it) renders. Used at server→client
 * boundaries so `select *` rows never serialize into the RSC Flight
 * payload — the wire shape becomes identical to what the paginated
 * catalog query (Step 2) already selects.
 */
export function toCatalogCardProduct(p: ProductWithVariants): CatalogCardProduct {
  return {
    id: p.id,
    slug: p.slug,
    name_ar: p.name_ar,
    name_en: p.name_en,
    base_price: p.base_price,
    sale_price: p.sale_price,
    images: p.images,
    image_fit: p.image_fit,
    material_type: p.material_type,
    dimensions: p.dimensions,
    weight_kg: p.weight_kg,
    laptop_inches: p.laptop_inches,
    capacity_liters: p.capacity_liters,
    wheel_type: p.wheel_type,
    lock_type: p.lock_type,
    is_water_resistant: p.is_water_resistant,
    is_expandable: p.is_expandable,
    product_variants: p.product_variants.map((v) => ({
      id: v.id,
      color_hex: v.color_hex,
      color_ar: v.color_ar,
      color_en: v.color_en,
      size_inches: v.size_inches,
      stock_qty: v.stock_qty,
      price_override: v.price_override,
    })),
  };
}

/**
 * The mega-menu's featured column renders exactly these seven values —
 * nothing else from the product row should cross into the client
 * bundle's props (MegaMenu is a "use client" component mounted on
 * every page of the site).
 */
export type MegaFeaturedItem = {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string;
  /** First product image, already unwrapped from the images array. */
  image: string | null;
  base_price: number;
  sale_price: number | null;
};

export function toMegaFeaturedItem(
  p: Pick<Product, "id" | "slug" | "name_ar" | "name_en" | "images" | "base_price" | "sale_price">,
): MegaFeaturedItem {
  return {
    id: p.id,
    slug: p.slug,
    name_ar: p.name_ar,
    name_en: p.name_en,
    image: p.images?.[0] ?? null,
    base_price: p.base_price,
    sale_price: p.sale_price,
  };
}

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

export function totalStock(product: {
  product_variants: Pick<ProductVariant, "stock_qty">[];
}): number {
  if (!product.product_variants.length) return 0;
  return product.product_variants.reduce((sum, v) => sum + (v.stock_qty ?? 0), 0);
}
