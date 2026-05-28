import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Collection } from "@/lib/supabase/types";
import type { CatalogSort, ProductWithVariants } from "@/lib/catalog-shared";
import { effectivePrice } from "@/lib/catalog-shared";

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
  sort?: CatalogSort;
} = {}): Promise<ProductWithVariants[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("products")
    .select("*, product_variants(*)")
    .eq("is_active", true);

  if (opts.collectionId) {
    query = query.eq("collection_id", opts.collectionId);
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

  const products = (data ?? []) as ProductWithVariants[];

  if (sort === "price-asc") {
    products.sort((a, b) => effectivePrice(a) - effectivePrice(b));
  } else if (sort === "price-desc") {
    products.sort((a, b) => effectivePrice(b) - effectivePrice(a));
  }

  return products;
}
