import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { StockMovementType } from "@/lib/supabase/types";

/**
 * Server queries for the /admin/stock screen's three tabs.
 *
 * Each helper returns a narrow, ready-to-render shape so the page
 * (server component) can compose them with one Promise.all and never
 * touch the supabase client in JSX.
 */

// ─── Shared display shape ────────────────────────────────────────────
export type StockRow = {
  variantId: string;
  productId: string;
  productName: string;
  productSlug: string;
  collectionSlug: string | null;
  collectionName: string | null;
  color: string | null;
  colorHex: string | null;
  size: string | null;
  sku: string | null;
  stockQty: number;
  /** UI bucket — drives the badge color. */
  status: "out" | "low" | "ok";
};

/** Threshold below which we call a variant "low". Tuned for the
    homepage urgency UI too — change in one place. */
export const LOW_STOCK_THRESHOLD = 10;

function bucketStatus(qty: number): StockRow["status"] {
  if (qty === 0) return "out";
  if (qty <= LOW_STOCK_THRESHOLD) return "low";
  return "ok";
}

// ─── Tab 1: full variant list ───────────────────────────────────────
export async function listStockRows(opts: {
  collectionSlug?: string;
  status?: "out" | "low" | "ok";
  q?: string;
} = {}): Promise<StockRow[]> {
  const admin = getSupabaseAdminClient();
  let q = admin
    .from("product_variants")
    .select(
      "id, color_ar, color_en, color_hex, size_inches, size_label_ar, sku, stock_qty, " +
      "product:products!inner(id, slug, name_ar, name_en, " +
      "collection:collections(slug, name_ar, name_en))",
    )
    .order("stock_qty", { ascending: true })
    .limit(500);

  // Free-text search across product names + sku. We use PostgREST's
  // `or` filter; commas inside the search are stripped to avoid
  // breaking the filter parser.
  const safe = opts.q?.trim().replace(/[*,()]/g, " ");
  if (safe) {
    q = q.or(
      `sku.ilike.*${safe}*,product.name_ar.ilike.*${safe}*,product.name_en.ilike.*${safe}*`,
    );
  }

  const { data } = await q;

  // Same supabase-js inference issue as elsewhere — the nested
  // products → collections join doesn't survive the type generator.
  type Coll = { slug: string; name_ar: string; name_en: string };
  const raw = (data ?? []) as unknown as Array<{
    id: string;
    color_ar: string | null;
    color_en: string | null;
    color_hex: string | null;
    size_inches: number | null;
    size_label_ar: string | null;
    sku: string | null;
    stock_qty: number | null;
    product:
      | {
          id: string;
          slug: string;
          name_ar: string;
          name_en: string;
          collection: Coll | Coll[] | null;
        }
      | Array<{
          id: string;
          slug: string;
          name_ar: string;
          name_en: string;
          collection: Coll | Coll[] | null;
        }>
      | null;
  }>;

  let rows: StockRow[] = raw.flatMap((r) => {
    const product = Array.isArray(r.product) ? r.product[0] : r.product;
    if (!product) return [];
    const collection = Array.isArray(product.collection)
      ? product.collection[0]
      : product.collection;
    return [
      {
        variantId: r.id,
        productId: product.id,
        productName: product.name_ar ?? product.name_en,
        productSlug: product.slug,
        collectionSlug: collection?.slug ?? null,
        collectionName: collection?.name_ar ?? collection?.name_en ?? null,
        color: r.color_ar ?? r.color_en ?? null,
        colorHex: r.color_hex,
        size: r.size_inches ? `${r.size_inches}"` : r.size_label_ar,
        sku: r.sku,
        stockQty: r.stock_qty ?? 0,
        status: bucketStatus(r.stock_qty ?? 0),
      },
    ];
  });

  if (opts.collectionSlug) {
    rows = rows.filter((r) => r.collectionSlug === opts.collectionSlug);
  }
  if (opts.status) {
    rows = rows.filter((r) => r.status === opts.status);
  }

  return rows;
}

// ─── Tab 2: movements timeline ───────────────────────────────────────
export type MovementRow = {
  id: string;
  type: StockMovementType;
  qtyChange: number;
  qtyBefore: number;
  qtyAfter: number;
  referenceType: string | null;
  referenceId: string | null;
  notes: string | null;
  createdAt: string;
  productName: string;
  productSlug: string | null;
  color: string | null;
  size: string | null;
};

export async function listStockMovements(opts: {
  type?: StockMovementType;
  productId?: string;
  limit?: number;
} = {}): Promise<MovementRow[]> {
  const admin = getSupabaseAdminClient();
  let q = admin
    .from("stock_movements")
    .select(
      "id, type, qty_change, qty_before, qty_after, reference_type, reference_id, notes, created_at, " +
      "variant:product_variants(color_ar, color_en, size_inches, size_label_ar), " +
      "product:products(name_ar, name_en, slug)",
    )
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 200);

  if (opts.type) q = q.eq("type", opts.type);
  if (opts.productId) q = q.eq("product_id", opts.productId);

  const { data } = await q;
  const rows = (data ?? []) as unknown as Array<{
    id: string;
    type: StockMovementType;
    qty_change: number;
    qty_before: number;
    qty_after: number;
    reference_type: string | null;
    reference_id: string | null;
    notes: string | null;
    created_at: string;
    variant:
      | { color_ar: string | null; color_en: string | null; size_inches: number | null; size_label_ar: string | null }
      | Array<{ color_ar: string | null; color_en: string | null; size_inches: number | null; size_label_ar: string | null }>
      | null;
    product:
      | { name_ar: string; name_en: string; slug: string }
      | Array<{ name_ar: string; name_en: string; slug: string }>
      | null;
  }>;
  return rows.map((r) => {
    const product = Array.isArray(r.product) ? r.product[0] : r.product;
    const variant = Array.isArray(r.variant) ? r.variant[0] : r.variant;
    return {
      id: r.id,
      type: r.type,
      qtyChange: r.qty_change,
      qtyBefore: r.qty_before,
      qtyAfter: r.qty_after,
      referenceType: r.reference_type,
      referenceId: r.reference_id,
      notes: r.notes,
      createdAt: r.created_at,
      productName: product?.name_ar ?? product?.name_en ?? "(deleted)",
      productSlug: product?.slug ?? null,
      color: variant?.color_ar ?? variant?.color_en ?? null,
      size: variant?.size_inches
        ? `${variant.size_inches}"`
        : variant?.size_label_ar ?? null,
    };
  });
}

// ─── Tab 3: low-stock grouped by collection ─────────────────────────
export type LowStockGroup = {
  collectionSlug: string | null;
  collectionName: string;
  rows: StockRow[];
};

export async function listLowStockByCollection(): Promise<LowStockGroup[]> {
  const all = await listStockRows({ status: "low" });
  const oos = await listStockRows({ status: "out" });
  const combined = [...oos, ...all].sort((a, b) => a.stockQty - b.stockQty);

  // Group preserving first-seen order — that yields the same sort the
  // admin sees scanning the page top-to-bottom.
  const map = new Map<string, LowStockGroup>();
  for (const r of combined) {
    const key = r.collectionSlug ?? "(uncategorized)";
    const entry = map.get(key);
    if (entry) {
      entry.rows.push(r);
    } else {
      map.set(key, {
        collectionSlug: r.collectionSlug,
        collectionName: r.collectionName ?? "Uncategorized",
        rows: [r],
      });
    }
  }
  return Array.from(map.values());
}
