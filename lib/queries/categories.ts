import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { categoryImage } from "@/lib/categories-config";
import type { Collection } from "@/lib/supabase/types";

export type TopLevelCategory = Collection & {
  productCount: number;
  /**
   * First active product's first image across the collection's full scope
   * (parent + child collections), picked in sort_order. Falls back to the
   * Unsplash placeholder from `categoryImage(slug)` when no products exist.
   */
  coverImage: string;
  /**
   * Lowest effective price (sale_price ?? base_price) across the
   * collection's full scope (parent + child collections), used by the
   * homepage collection card's "from X EGP" hint. `null` when no active
   * products live in this scope. Variant-level price_override is NOT
   * consulted — it's rare and inspecting it would double the query cost.
   */
  minPrice: number | null;
};

/**
 * All top-level collections (parent_slug IS NULL) with a product count
 * that aggregates direct + descendant products, and a cover image pulled
 * dynamically from the first active product in the collection's scope.
 * A parent like "travel-bags" sums and samples across
 * milano-series + calvin-klein + travel-accessories.
 */
export async function getTopLevelCategoriesWithCounts(): Promise<TopLevelCategory[]> {
  const supabase = await createSupabaseServerClient();

  const { data: collections } = await supabase
    .from("collections")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (!collections) return [];

  // One round-trip pulls every active product's collection + images + order
  // + price fields. We use the same payload for counts, cover-image lookup,
  // and per-collection minPrice (min of sale_price ?? base_price).
  const { data: productRows } = await supabase
    .from("products")
    .select("collection_id, images, sort_order, base_price, sale_price")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const directCounts = new Map<string, number>();
  const firstImageByCollection = new Map<string, string>();
  const directMinPrice = new Map<string, number>();
  for (const row of productRows ?? []) {
    if (!row.collection_id) continue;
    directCounts.set(row.collection_id, (directCounts.get(row.collection_id) ?? 0) + 1);
    if (
      !firstImageByCollection.has(row.collection_id) &&
      Array.isArray(row.images) &&
      row.images.length > 0 &&
      typeof row.images[0] === "string" &&
      row.images[0].length > 0
    ) {
      firstImageByCollection.set(row.collection_id, row.images[0]);
    }
    // Effective price = sale_price when set, else base_price. Guard
    // against non-numeric rows (nullable columns per schema).
    const eff =
      typeof row.sale_price === "number" && row.sale_price > 0
        ? row.sale_price
        : typeof row.base_price === "number" && row.base_price > 0
          ? row.base_price
          : null;
    if (eff !== null) {
      const current = directMinPrice.get(row.collection_id);
      if (current === undefined || eff < current) {
        directMinPrice.set(row.collection_id, eff);
      }
    }
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

      // Cover image: prefer the parent's own first product, otherwise walk
      // children in sort_order. Children come from `collections` which was
      // already sorted, so iteration order is correct.
      let coverImage = firstImageByCollection.get(c.id);
      if (!coverImage) {
        for (const child of children) {
          const childImage = firstImageByCollection.get(child.id);
          if (childImage) {
            coverImage = childImage;
            break;
          }
        }
      }

      // minPrice: min of the parent's own direct minPrice and each
      // child's directMinPrice. Undefined when no priced product exists
      // anywhere in the scope — the card just hides the "من X" chip.
      let minPrice: number | null = null;
      const parentMin = directMinPrice.get(c.id);
      if (parentMin !== undefined) minPrice = parentMin;
      for (const child of children) {
        const childMin = directMinPrice.get(child.id);
        if (childMin !== undefined && (minPrice === null || childMin < minPrice)) {
          minPrice = childMin;
        }
      }

      return {
        ...c,
        productCount: direct + childTotal,
        coverImage: coverImage ?? categoryImage(c.slug),
        minPrice,
      };
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
