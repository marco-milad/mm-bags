import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ProductWithVariants } from "@/lib/catalog-shared";

/**
 * Catalog query for the POS screen.
 *
 * Different from the storefront's `getProducts` in two ways:
 *   1. We filter on `show_in_store = true` instead of `is_active`, so
 *      store-only items (admins flagged `is_active=false` to hide them
 *      from the website but kept on the shelf) still ring up at the
 *      till.
 *   2. We always pull variants — the POS needs the full variant list
 *      for the picker; no place to fetch them lazily.
 */
export async function getProductsForPos(): Promise<ProductWithVariants[]> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("products")
    .select("*, product_variants(*)")
    .eq("show_in_store", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw new Error(`getProductsForPos failed: ${error.message}`);
  return (data ?? []) as ProductWithVariants[];
}

/**
 * Resolve the currently-signed-in user to their staff row. Returns
 * null when the user isn't on the staff roster (still valid for an
 * admin operator — the sale will record `cashier_id = null`).
 */
export async function getCurrentCashier(
  userId: string | null,
): Promise<{ id: string; name: string; role: string } | null> {
  if (!userId) return null;
  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from("staff")
    .select("id, name, role, is_active")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();
  return data ? { id: data.id, name: data.name, role: data.role } : null;
}
