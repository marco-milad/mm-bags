import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  Collection,
  Product,
  ProductVariant,
} from "@/lib/supabase/types";

/**
 * Admin product queries. Distinct from the storefront `getProducts`
 * because here we want EVERY row — including is_active=false (online-
 * hidden) and show_in_store=false (POS-hidden) — and we don't want
 * variant relationships on the listing (it's a table, not a card).
 *
 * Filters are URL-driven so a reload preserves the view, and the
 * collection / stock-status filters are applied server-side via
 * PostgREST where cheap, falling back to JS where they require an
 * aggregate (stock totals across variants).
 */

export type AdminProductRow = Pick<
  Product,
  | "id"
  | "slug"
  | "name_ar"
  | "name_en"
  | "base_price"
  | "sale_price"
  | "is_active"
  | "show_in_store"
  | "images"
  | "collection_id"
  | "created_at"
> & {
  collection_name: string | null;
  total_stock: number;
};

export type StockStatus = "out" | "low" | "ok";

export type ListAdminProductFilters = {
  collectionId?: string;
  isActive?: "true" | "false";
  stock?: StockStatus;
  q?: string;
};

export async function listAdminProducts(
  filters: ListAdminProductFilters = {},
): Promise<AdminProductRow[]> {
  const admin = getSupabaseAdminClient();
  let q = admin
    .from("products")
    .select(
      "id, slug, name_ar, name_en, base_price, sale_price, is_active, show_in_store, images, collection_id, created_at, " +
      "collection:collections(name_ar, name_en), " +
      "variants:product_variants(stock_qty)",
    )
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(1000);

  if (filters.collectionId) q = q.eq("collection_id", filters.collectionId);
  if (filters.isActive === "true") q = q.eq("is_active", true);
  if (filters.isActive === "false") q = q.eq("is_active", false);
  if (filters.q?.trim()) {
    // PostgREST `or` filter — strip wildcard/special chars that would
    // escape the filter syntax.
    const safe = filters.q.trim().replace(/[*,()]/g, " ");
    q = q.or(`name_ar.ilike.*${safe}*,name_en.ilike.*${safe}*,slug.ilike.*${safe}*`);
  }

  const { data } = await q;
  // Reverse-relationship join: cast through unknown — same pattern as
  // the rest of admin-* queries.
  const raw = (data ?? []) as unknown as Array<{
    id: string;
    slug: string;
    name_ar: string;
    name_en: string;
    base_price: number;
    sale_price: number | null;
    is_active: boolean;
    show_in_store: boolean;
    images: string[] | null;
    collection_id: string | null;
    created_at: string;
    collection:
      | { name_ar: string; name_en: string }
      | Array<{ name_ar: string; name_en: string }>
      | null;
    variants: Array<{ stock_qty: number | null }> | null;
  }>;

  let rows: AdminProductRow[] = raw.map((r) => {
    const collection = Array.isArray(r.collection) ? r.collection[0] : r.collection;
    const total = (r.variants ?? []).reduce(
      (s, v) => s + (v.stock_qty ?? 0),
      0,
    );
    return {
      id: r.id,
      slug: r.slug,
      name_ar: r.name_ar,
      name_en: r.name_en,
      base_price: r.base_price,
      sale_price: r.sale_price,
      is_active: r.is_active,
      show_in_store: r.show_in_store,
      images: r.images ?? [],
      collection_id: r.collection_id,
      created_at: r.created_at,
      collection_name: collection?.name_ar ?? collection?.name_en ?? null,
      total_stock: total,
    };
  });

  // stock filter is a derived value — apply in JS after the fetch.
  if (filters.stock) {
    rows = rows.filter((r) => bucketStock(r.total_stock) === filters.stock);
  }

  return rows;
}

function bucketStock(qty: number): StockStatus {
  if (qty === 0) return "out";
  if (qty <= 10) return "low";
  return "ok";
}

// ─── Edit detail ────────────────────────────────────────────────────
export type AdminProductDetail = Product & {
  variants: ProductVariant[];
};

export async function getProductForEdit(
  id: string,
): Promise<AdminProductDetail | null> {
  const admin = getSupabaseAdminClient();
  const [productRes, variantsRes] = await Promise.all([
    admin.from("products").select("*").eq("id", id).maybeSingle(),
    admin
      .from("product_variants")
      .select("*")
      .eq("product_id", id)
      .order("created_at", { ascending: true }),
  ]);
  if (!productRes.data) return null;
  return {
    ...(productRes.data as Product),
    variants: (variantsRes.data ?? []) as ProductVariant[],
  };
}

/**
 * Collections list for the form's dropdown. Sorted by name to make
 * the picker easy to scan.
 */
export async function listAllCollections(): Promise<Collection[]> {
  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from("collections")
    .select("*")
    .order("name_ar", { ascending: true });
  return (data ?? []) as Collection[];
}
