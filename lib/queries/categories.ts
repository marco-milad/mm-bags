import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Collection } from "@/lib/supabase/types";

export type TopLevelCategory = Collection & {
  productCount: number;
};

/**
 * All top-level collections (parent_slug IS NULL) with a product count
 * that aggregates direct + descendant products. A parent like "travel-bags"
 * shows the sum of products across milano-series + calvin-klein + travel-accessories.
 */
export async function getTopLevelCategoriesWithCounts(): Promise<TopLevelCategory[]> {
  const supabase = await createSupabaseServerClient();

  const { data: collections } = await supabase
    .from("collections")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (!collections) return [];

  // Compute counts per collection in a single round-trip
  const { data: productCollections } = await supabase
    .from("products")
    .select("collection_id")
    .eq("is_active", true);

  const directCounts = new Map<string, number>();
  for (const row of productCollections ?? []) {
    if (!row.collection_id) continue;
    directCounts.set(row.collection_id, (directCounts.get(row.collection_id) ?? 0) + 1);
  }

  const childrenByParent = new Map<string, Collection[]>();
  for (const c of collections) {
    if (c.parent_slug) {
      const arr = childrenByParent.get(c.parent_slug) ?? [];
      arr.push(c);
      childrenByParent.set(c.parent_slug, arr);
    }
  }

  return collections
    .filter((c) => c.parent_slug === null)
    .map((c) => {
      const direct = directCounts.get(c.id) ?? 0;
      const children = childrenByParent.get(c.slug) ?? [];
      const childTotal = children.reduce(
        (sum, child) => sum + (directCounts.get(child.id) ?? 0),
        0,
      );
      return { ...c, productCount: direct + childTotal };
    });
}

export async function getSubCollections(parentSlug: string): Promise<Collection[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("collections")
    .select("*")
    .eq("parent_slug", parentSlug)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  return data ?? [];
}

export type CollectionScope = {
  collection: Collection;
  collectionIds: string[]; // IDs to query products from (parent: itself + children; leaf: just itself)
  subCollections: Collection[]; // present only when collection is a parent
};

/**
 * Resolve a slug to its full product scope. For a parent collection,
 * returns the parent ID PLUS all child collection IDs so /catalog/travel-bags
 * shows products from milano + calvin-klein + travel-accessories.
 */
export async function resolveCollectionScope(
  slug: string,
): Promise<CollectionScope | null> {
  const supabase = await createSupabaseServerClient();
  const { data: collection } = await supabase
    .from("collections")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!collection) return null;

  const subs = await getSubCollections(collection.slug);
  const ids = [collection.id, ...subs.map((c) => c.id)];

  return { collection, collectionIds: ids, subCollections: subs };
}
