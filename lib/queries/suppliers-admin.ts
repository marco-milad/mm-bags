import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  PurchaseOrder,
  PurchaseOrderStatus,
  Supplier,
} from "@/lib/supabase/types";

/**
 * Server queries for /admin/suppliers and /admin/purchase-orders.
 *
 * Suppliers carry running totals (total_paid, total_owed) maintained
 * by the purchase-order actions in lib/admin/supplier-actions.ts —
 * we don't sum on-the-fly here because the same fields drive the
 * supplier list and the dashboard's overdue-PO alert.
 */

export async function listSuppliers(): Promise<Supplier[]> {
  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from("suppliers")
    .select("*")
    .order("name", { ascending: true });
  return (data ?? []) as Supplier[];
}

export async function getSupplierById(id: string): Promise<Supplier | null> {
  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from("suppliers")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data ?? null) as Supplier | null;
}

// ─── Purchase orders ────────────────────────────────────────────────
export type PurchaseOrderRow = PurchaseOrder & {
  supplier_name: string | null;
  item_count: number;
};

export async function listPurchaseOrders(
  filters: {
    status?: PurchaseOrderStatus;
    supplierId?: string;
    /** When true, restrict to POs that still owe the supplier money
        AND were created more than 30 days ago. Matches the dashboard's
        existing overdue threshold (lib/queries/admin-dashboard.ts). */
    overdue?: boolean;
  } = {},
): Promise<PurchaseOrderRow[]> {
  const admin = getSupabaseAdminClient();
  let q = admin
    .from("purchase_orders")
    .select(
      "*, supplier:suppliers(name), items:purchase_order_items(id)",
    )
    .order("created_at", { ascending: false });
  if (filters.status) q = q.eq("status", filters.status);
  if (filters.supplierId) q = q.eq("supplier_id", filters.supplierId);
  if (filters.overdue) {
    const cutoff = new Date(Date.now() - 30 * 86400_000).toISOString();
    q = q.gt("amount_owed", 0).lt("created_at", cutoff);
  }

  const { data } = await q;
  // Supabase-js can't yet infer the reverse join's row shape; the
  // runtime result is the obvious one, so we cast through unknown
  // rather than push a giant generic into the call site.
  const rows = (data ?? []) as unknown as Array<
    PurchaseOrder & {
      supplier: { name: string } | { name: string }[] | null;
      items: Array<{ id: string }> | null;
    }
  >;
  return rows.map((row) => {
    const supplier = Array.isArray(row.supplier) ? row.supplier[0] : row.supplier;
    const items = row.items ?? [];
    return {
      ...(row as PurchaseOrder),
      supplier_name: supplier?.name ?? null,
      item_count: items.length,
    };
  });
}

export type PurchaseOrderDetail = PurchaseOrder & {
  supplier_name: string | null;
  items: Array<{
    id: string;
    product_id: string | null;
    variant_id: string | null;
    qty: number;
    unit_cost: number;
    total_cost: number;
    product_name: string | null;
    variant_label: string | null;
  }>;
};

export async function getPurchaseOrderDetail(
  id: string,
): Promise<PurchaseOrderDetail | null> {
  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from("purchase_orders")
    .select(
      "*, supplier:suppliers(name), " +
      "items:purchase_order_items(id, product_id, variant_id, qty, unit_cost, total_cost, " +
      "product:products(name_ar, name_en), " +
      "variant:product_variants(color_ar, color_en, size_inches, size_label_ar))",
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  // Reverse-join inference (purchase_orders → items) still trips the
  // supabase-js type generator; cast through unknown.
  const row = data as unknown as PurchaseOrder & {
    supplier: { name: string } | { name: string }[] | null;
    items:
      | Array<{
          id: string;
          product_id: string | null;
          variant_id: string | null;
          qty: number;
          unit_cost: number;
          total_cost: number;
          product:
            | { name_ar: string; name_en: string }
            | Array<{ name_ar: string; name_en: string }>
            | null;
          variant:
            | {
                color_ar: string | null;
                color_en: string | null;
                size_inches: number | null;
                size_label_ar: string | null;
              }
            | Array<{
                color_ar: string | null;
                color_en: string | null;
                size_inches: number | null;
                size_label_ar: string | null;
              }>
            | null;
        }>
      | null;
  };
  const supplier = Array.isArray(row.supplier) ? row.supplier[0] : row.supplier;
  const items = row.items ?? [];
  return {
    ...(row as unknown as PurchaseOrder),
    supplier_name: supplier?.name ?? null,
    items: items.map((it) => {
      const product = Array.isArray(it.product) ? it.product[0] : it.product;
      const variant = Array.isArray(it.variant) ? it.variant[0] : it.variant;
      return {
        id: it.id,
        product_id: it.product_id,
        variant_id: it.variant_id,
        qty: it.qty,
        unit_cost: it.unit_cost,
        total_cost: it.total_cost,
        product_name: product?.name_ar ?? product?.name_en ?? null,
        variant_label: variant
          ? [
              variant.color_ar ?? variant.color_en,
              variant.size_inches
                ? `${variant.size_inches}"`
                : variant.size_label_ar,
            ]
              .filter(Boolean)
              .join(" · ")
          : null,
      };
    }),
  } as PurchaseOrderDetail;
}

/**
 * Lightweight variant fetcher for the new-purchase-order form's
 * variant picker. Returns product name + variant label for every
 * variant the admin might add to a PO.
 */
export type VariantOption = {
  variantId: string;
  productId: string;
  productName: string;
  variantLabel: string;
  stockQty: number;
};

export async function listVariantOptions(): Promise<VariantOption[]> {
  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from("product_variants")
    .select(
      "id, color_ar, color_en, size_inches, size_label_ar, stock_qty, " +
      "product:products!inner(id, name_ar, name_en)",
    )
    .order("created_at", { ascending: false })
    .limit(500);

  const rows = (data ?? []) as unknown as Array<{
    id: string;
    color_ar: string | null;
    color_en: string | null;
    size_inches: number | null;
    size_label_ar: string | null;
    stock_qty: number | null;
    product:
      | { id: string; name_ar: string; name_en: string }
      | Array<{ id: string; name_ar: string; name_en: string }>
      | null;
  }>;
  return rows.flatMap((r) => {
    const product = Array.isArray(r.product) ? r.product[0] : r.product;
    if (!product) return [];
    const label = [
      r.color_ar ?? r.color_en,
      r.size_inches ? `${r.size_inches}"` : r.size_label_ar,
    ]
      .filter(Boolean)
      .join(" · ") || "—";
    return [
      {
        variantId: r.id,
        productId: product.id,
        productName: product.name_ar ?? product.name_en,
        variantLabel: label,
        stockQty: r.stock_qty ?? 0,
      },
    ];
  });
}
