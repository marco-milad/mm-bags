"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/auth";

/**
 * Server actions for /admin/homepage — managing the curated list of
 * products that surface on the storefront homepage carousel.
 *
 * Mirrors the patterns in product-actions.ts:
 *   - `"use server"` at the top, each action calls `requireAdmin()` first
 *     (Server Actions are addressable POST endpoints, so auth is inline).
 *   - Writes go through `getSupabaseAdminClient()` (service role).
 *   - Side-effect actions return `void` and surface failures via
 *     `console.error` — there's no UI error contract yet for this surface.
 *   - Successful mutations revalidate `/admin/homepage` plus both
 *     locale roots so the storefront picks up the new ordering on the
 *     next render.
 */

const REVALIDATE_PATHS = ["/admin/homepage", "/ar", "/en"] as const;

function revalidateAll(): void {
  for (const p of REVALIDATE_PATHS) revalidatePath(p);
}

/**
 * Append a product to the featured list at the next available position.
 *
 * Idempotency: `homepage_featured_products.product_id` is UNIQUE, so a
 * duplicate insert raises 23505 — we swallow it and treat as success
 * rather than surfacing a confusing error. The MAX(position)+1 lookup
 * happens server-side; concurrent adds could theoretically collide on
 * the same position number, but `position` has no uniqueness constraint
 * (gaps are fine, the reorder action rewrites them all) so a tie is
 * harmless — both rows land at the same index until the next reorder.
 */
export async function addFeaturedProduct(formData: FormData): Promise<void> {
  // Void-returning action — let auth throws bubble so stale-cookie
  // clicks surface explicitly instead of fail-open silence.
  await requireAdmin(["admin", "manager"]);
  const product_id = formData.get("product_id");
  if (typeof product_id !== "string" || product_id.length === 0) return;

  const admin = getSupabaseAdminClient();

  // Find the current max position so we can append. `maybeSingle()`
  // returns null when the table is empty — in which case we start at 0.
  const { data: topRow, error: topErr } = await admin
    .from("homepage_featured_products")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (topErr) {
    console.error("[addFeaturedProduct] max position lookup failed", topErr);
    return;
  }
  const nextPosition =
    topRow && typeof topRow.position === "number" ? topRow.position + 1 : 0;

  const { error } = await admin
    .from("homepage_featured_products")
    .insert({ product_id, position: nextPosition });
  if (error) {
    // 23505 = unique_violation. The product is already featured;
    // re-adding is a no-op per the contract.
    if (error.code === "23505") {
      revalidateAll();
      return;
    }
    console.error("[addFeaturedProduct] insert failed", error);
    return;
  }
  revalidateAll();
}

/**
 * Remove a single row from the featured list by its row id (NOT the
 * product_id — the manager UI passes the join-row id so it can also
 * drive reorder, which is keyed the same way). The deleted row's
 * `position` is left as a gap; the next reorder rewrites all indices.
 */
export async function removeFeaturedProduct(
  formData: FormData,
): Promise<void> {
  // Void-returning action — let auth throws bubble so stale-cookie
  // clicks surface explicitly instead of fail-open silence.
  await requireAdmin(["admin", "manager"]);
  const id = formData.get("id");
  if (typeof id !== "string" || id.length === 0) return;

  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("homepage_featured_products")
    .delete()
    .eq("id", id);
  if (error) {
    console.error("[removeFeaturedProduct] delete failed", error);
    return;
  }
  revalidateAll();
}

/**
 * Replace every row's `position` according to the order of the
 * submitted id list. The caller (FeaturedProductsManager) sends the
 * final ordering after any local drag/up/down moves; we treat the
 * array index as the canonical 0-based position.
 *
 * Implementation: one UPDATE per row. The list is bounded by the
 * number of featured products (small — admin-curated, typically < 20),
 * so the round-trip cost is acceptable and the code stays simple.
 * If any single update fails we log and continue — a partial reorder
 * is still better than a hard abort that leaves the UI mismatched
 * with the DB; the next reorder pass will reconcile.
 */
export async function reorderFeaturedProducts(
  formData: FormData,
): Promise<void> {
  // Void-returning action — let auth throws bubble so stale-cookie
  // clicks surface explicitly instead of fail-open silence.
  await requireAdmin(["admin", "manager"]);
  const raw = formData.get("ordered_ids");
  if (typeof raw !== "string" || raw.length === 0) return;
  if (raw.length > 20_000) return; // hard cap to dodge OOM on hostile input

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    console.error("[reorderFeaturedProducts] invalid JSON", e);
    return;
  }
  if (!Array.isArray(parsed)) return;

  const orderedIds = parsed.filter(
    (v): v is string => typeof v === "string" && v.length > 0,
  );
  if (orderedIds.length === 0) return;

  const admin = getSupabaseAdminClient();
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await admin
      .from("homepage_featured_products")
      .update({ position: i })
      .eq("id", orderedIds[i]);
    if (error) {
      console.error(
        `[reorderFeaturedProducts] update failed for id=${orderedIds[i]} idx=${i}`,
        error,
      );
      // continue — partial reorder is preferable to a hard abort
    }
  }
  revalidateAll();
}

/**
 * Set the single product that appears in the homepage spotlight
 * section (rendered by components/home/FeaturedProduct.tsx). Upserts
 * the single row of `homepage_featured_spotlight` keyed on the
 * `id = true` singleton constraint — replacing whatever was there.
 *
 * No add/remove/reorder semantics like the best-sellers list: this
 * surface only ever holds one product. To clear it entirely, call
 * `clearFeaturedSpotlight` below.
 */
export async function setFeaturedSpotlight(formData: FormData): Promise<void> {
  // Void-returning action — let auth throws bubble so stale-cookie
  // clicks surface explicitly instead of fail-open silence.
  await requireAdmin(["admin", "manager"]);
  const product_id = formData.get("product_id");
  if (typeof product_id !== "string" || product_id.length === 0) return;

  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("homepage_featured_spotlight")
    .upsert(
      {
        id: true,
        product_id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
  if (error) {
    console.error("[setFeaturedSpotlight] upsert failed", error);
    return;
  }
  revalidateAll();
}

/**
 * Clear the spotlight — deletes the singleton row. The homepage falls
 * back to the legacy `tags @> ['featured']` pick via getFeaturedProduct
 * so the section doesn't blink to empty, and the admin sees an empty
 * "currently set" pane.
 */
export async function clearFeaturedSpotlight(): Promise<void> {
  // Void-returning action — let auth throws bubble so stale-cookie
  // clicks surface explicitly instead of fail-open silence.
  await requireAdmin(["admin", "manager"]);
  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("homepage_featured_spotlight")
    .delete()
    .eq("id", true);
  if (error) {
    console.error("[clearFeaturedSpotlight] delete failed", error);
    return;
  }
  revalidateAll();
}
