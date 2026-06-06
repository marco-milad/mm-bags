import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Collection } from "@/lib/supabase/types";
import type { CatalogSort, ProductWithVariants } from "@/lib/catalog-shared";
import { effectivePrice } from "@/lib/catalog-shared";

export type ProductDetail = ProductWithVariants & { collection: Collection | null };

export type CollectionWithCount = Collection & { productCount: number };

export async function getCollectionsWithCounts(): Promise<CollectionWithCount[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("collections")
    .select("*, products!inner(id, is_active)")
    .eq("is_active", true)
    .eq("products.is_active", true)
    .order("sort_order", { ascending: true });

  if (error || !data) return [];

  // The above join only returns collections that have at least one active product.
  // Fetch ALL active collections separately so empty collections still appear.
  const { data: allCollections } = await supabase
    .from("collections")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const countsBySlug = new Map<string, number>();
  for (const row of data) {
    const products = Array.isArray(row.products) ? row.products : [];
    countsBySlug.set(row.slug, products.length);
  }

  return (allCollections ?? []).map((c) => ({
    ...c,
    productCount: countsBySlug.get(c.slug) ?? 0,
  }));
}

export async function getCollections(): Promise<Collection[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("collections")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(`getCollections failed: ${error.message}`);
  return data ?? [];
}

export async function getCollectionBySlug(slug: string): Promise<Collection | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("collections")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error(`getCollectionBySlug(${slug}) failed: ${error.message}`);
  return data;
}

export async function getProducts(opts: {
  collectionId?: string;
  collectionIds?: string[]; // takes precedence over collectionId
  sort?: CatalogSort;
  sizeInches?: number;
  setOnly?: boolean;
  tag?: string;
  q?: string; // free-text search over name_ar / name_en
  material?: string; // filter by exact material_type value
  limit?: number;
} = {}): Promise<ProductWithVariants[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("products")
    .select("*, product_variants(*)")
    .eq("is_active", true);

  if (opts.collectionIds && opts.collectionIds.length > 0) {
    query = query.in("collection_id", opts.collectionIds);
  } else if (opts.collectionId) {
    query = query.eq("collection_id", opts.collectionId);
  }
  if (opts.tag) {
    query = query.contains("tags", [opts.tag]);
  }
  if (opts.material) {
    // material_type is the structured single-word column populated by the
    // specs system. The ShopByMaterial section deep-links the exact value
    // (e.g. "Polycarbonate", "Faux Leather") so we match it as-is.
    query = query.eq("material_type", opts.material);
  }
  if (opts.q) {
    // PostgREST `.or()` uses `*` as the wildcard inside its filter-string syntax.
    // Strip any `*`, `,`, parens, or commas the user typed so they can't break
    // the parser or escape into another filter.
    const safe = opts.q.trim().replace(/[*,()]/g, " ");
    if (safe) {
      query = query.or(`name_ar.ilike.*${safe}*,name_en.ilike.*${safe}*`);
    }
  }

  const sort = opts.sort ?? "featured";
  if (sort === "newest") {
    query = query.order("created_at", { ascending: false });
  } else {
    // featured | price-* — fetch by sort_order; price sorts applied client-side
    // because PostgREST can't ORDER BY COALESCE(sale_price, base_price).
    query = query
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
  }

  const { data, error } = await query;
  if (error) throw new Error(`getProducts failed: ${error.message}`);

  let products = (data ?? []) as ProductWithVariants[];

  // PostgREST can't filter a parent row by a condition on a nested table; do it here.
  if (opts.sizeInches !== undefined) {
    const target = opts.sizeInches;
    products = products.filter((p) =>
      p.product_variants.some((v) => v.size_inches === target),
    );
  }
  if (opts.setOnly) {
    products = products.filter((p) => (p.tags ?? []).includes("set"));
  }

  if (sort === "price-asc") {
    products.sort((a, b) => effectivePrice(a) - effectivePrice(b));
  } else if (sort === "price-desc") {
    products.sort((a, b) => effectivePrice(b) - effectivePrice(a));
  }

  if (opts.limit) {
    return products.slice(0, opts.limit);
  }
  return products;
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, product_variants(*), collection:collections(*)")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error(`getProductBySlug(${slug}) failed: ${error.message}`);
  return data as ProductDetail | null;
}

/**
 * Returns the single product tagged 'featured', joined with its collection for
 * the eyebrow on the homepage Featured section. Picks the lowest sort_order if
 * multiple products carry the tag so the choice is stable.
 */
export async function getFeaturedProduct(): Promise<ProductDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, product_variants(*), collection:collections(*)")
    .eq("is_active", true)
    .contains("tags", ["featured"])
    .order("sort_order", { ascending: true })
    .limit(1);

  if (error) throw new Error(`getFeaturedProduct failed: ${error.message}`);
  const row = data?.[0];
  return (row ?? null) as ProductDetail | null;
}

export type MaterialCount = {
  material_type: string;
  productCount: number;
};

/**
 * Reads distinct material_type values + their active-product counts. The
 * ShopByMaterial section renders the result verbatim — admins adding a new
 * material_type to a product surface it here automatically (no hardcode).
 *
 * PostgREST doesn't support GROUP BY, so we pull material_type for all active
 * products and aggregate in JS. With ~60 products this is single-digit ms.
 */
export async function getMaterialCounts(): Promise<MaterialCount[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("material_type")
    .eq("is_active", true)
    .not("material_type", "is", null);

  if (error) throw new Error(`getMaterialCounts failed: ${error.message}`);

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const m = row.material_type;
    if (!m) continue;
    counts.set(m, (counts.get(m) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([material_type, productCount]) => ({ material_type, productCount }))
    .sort((a, b) => b.productCount - a.productCount);
}

export async function getRelatedProducts(opts: {
  excludeProductId: string;
  collectionId: string | null;
  limit?: number;
}): Promise<ProductWithVariants[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("products")
    .select("*, product_variants(*)")
    .eq("is_active", true)
    .neq("id", opts.excludeProductId)
    .limit(opts.limit ?? 4);

  if (opts.collectionId) {
    query = query.eq("collection_id", opts.collectionId);
  }

  const { data, error } = await query.order("sort_order", { ascending: true });
  if (error) throw new Error(`getRelatedProducts failed: ${error.message}`);
  return (data ?? []) as ProductWithVariants[];
}
