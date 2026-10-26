"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ProductWithVariants } from "@/lib/catalog-shared";
import { sanitizeProductIds, type WishlistItem } from "@/lib/wishlist/merge";

// These actions mirror local wishlist mutations into Supabase for logged-in
// users. Guests have no `auth.uid()`, so each action no-ops cleanly (and
// reports success: there is nothing to be out of sync with).
//
// Writes check-then-insert instead of upsert: the table's
// unique(user_id, product_id, variant_id) never fires for the NULL
// variant_id rows we write (NULLs are distinct in Postgres), so an upsert
// silently inserted a duplicate row on every add. Migration 0028 adds a
// partial unique index for those rows; PostgREST can't target a partial
// index with on_conflict, so a 23505 from a concurrent add means "already
// saved", not failure.

/** Returns false when the DB write failed for a signed-in user. */
export async function dbWishlistAdd(productId: string): Promise<boolean> {
  const [id] = sanitizeProductIds([productId]);
  if (!id) return false;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return true;

  const { data: existing, error: readErr } = await supabase
    .from("wishlists")
    .select("id")
    .eq("user_id", user.id)
    .eq("product_id", id)
    .limit(1);
  if (readErr) return false;
  if (existing && existing.length > 0) return true;

  const { error } = await supabase
    .from("wishlists")
    .insert({ user_id: user.id, product_id: id, variant_id: null });
  // 23505 = another device saved it between our check and insert.
  return !error || error.code === "23505";
}

/** Returns false when the DB delete failed for a signed-in user. */
export async function dbWishlistRemove(productId: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return true;

  const { error } = await supabase
    .from("wishlists")
    .delete()
    .eq("user_id", user.id)
    .eq("product_id", productId);
  return !error;
}

/**
 * Bulk-adds product ids to the signed-in user's wishlist, skipping ones
 * already saved and ones that are not active products (a stale guest
 * wishlist would otherwise fail the whole insert on the FK). Used by
 * WishlistSync to upload a device's guest wishlist after sign-in.
 *
 * `expectedUserId` is who the browser thinks is signed in. If the server's
 * session disagrees (expired cookie, different account) this reports
 * failure rather than a silent no-op success, so the caller keeps its local
 * list instead of reconciling it against the wrong (or no) account.
 */
export async function dbWishlistMerge(
  productIds: unknown,
  expectedUserId: string,
): Promise<boolean> {
  const ids = sanitizeProductIds(productIds);
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.id !== expectedUserId) return false;
  if (ids.length === 0) return true;

  const [{ data: existing, error: readErr }, { data: live, error: liveErr }] =
    await Promise.all([
      supabase
        .from("wishlists")
        .select("product_id")
        .eq("user_id", user.id)
        .in("product_id", ids),
      supabase
        .from("products")
        .select("id")
        .in("id", ids)
        .eq("is_active", true),
    ]);
  if (readErr || liveErr) return false;

  const saved = new Set((existing ?? []).map((r) => r.product_id));
  const liveIds = new Set((live ?? []).map((r) => r.id));
  const rows = ids
    .filter((id) => liveIds.has(id) && !saved.has(id))
    .map((id) => ({ user_id: user.id, product_id: id, variant_id: null }));
  if (rows.length === 0) return true;

  const { error } = await supabase.from("wishlists").insert(rows);
  if (!error) return true;
  if (error.code !== "23505") return false;

  // A concurrent add raced one of these rows in, which fails the whole
  // batch. Fall back to one insert per row, where a duplicate is fine.
  const results = await Promise.all(
    rows.map((row) => supabase.from("wishlists").insert(row)),
  );
  return results.every((r) => !r.error || r.error.code === "23505");
}

export async function getWishlistedProducts(
  ids: string[],
): Promise<ProductWithVariants[]> {
  if (ids.length === 0) return [];
  // Cap at 100 to prevent runaway queries.
  const safeIds = ids.slice(0, 100);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, product_variants(*)")
    .in("id", safeIds)
    .eq("is_active", true);
  if (error) return [];
  return (data ?? []) as ProductWithVariants[];
}

/**
 * The signed-in user's saved wishlist as store items (product display
 * fields joined from `products`), or null when the read failed so callers
 * can tell "empty" from "unknown". Also null when the server's session is
 * not `expectedUserId` (see dbWishlistMerge): an empty list for "no user"
 * would otherwise wipe the device's list.
 */
export async function dbWishlistFetch(
  expectedUserId: string,
): Promise<WishlistItem[] | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.id !== expectedUserId) return null;

  const { data, error } = await supabase
    .from("wishlists")
    .select("product_id, added_at, products(slug, name_ar, name_en, images, is_active)")
    .eq("user_id", user.id)
    .order("added_at", { ascending: false })
    .limit(200);
  if (error) return null;

  const items: WishlistItem[] = [];
  for (const row of data ?? []) {
    const p = row.products;
    if (!row.product_id || !p || !p.is_active) continue;
    const addedAt = Date.parse(row.added_at);
    items.push({
      productId: row.product_id,
      productSlug: p.slug,
      name_ar: p.name_ar,
      name_en: p.name_en,
      image: p.images?.[0] ?? null,
      addedAt: Number.isNaN(addedAt) ? Date.now() : addedAt,
    });
  }
  return items;
}
