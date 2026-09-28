"use server";

import { revalidatePath } from "next/cache";
import { revalidateProduct } from "@/lib/cache/revalidate-public";
import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/auth";

const adjustSchema = z.object({
  variantId: z.uuid(),
  /** Signed change. Positive = restock, negative = manual write-off. */
  delta: z.number().int().refine((v) => v !== 0, "Delta must be non-zero"),
  reason: z.string().trim().max(200).optional(),
});

export type AdjustResult = { ok: true; newQty: number } | { ok: false; error: string };

/**
 * Manual stock adjustment.
 *
 * Unlike sale-driven movements (which run through deduct_stock_atomic),
 * adjustments can be positive OR negative — a restock, a damage write-
 * off, a count correction. We:
 *   1. Lock the variant row via a read+update,
 *   2. Refuse to go below zero,
 *   3. Write a stock_movements row of type 'adjustment' for the audit
 *      trail.
 *
 * Because PostgREST can't take a row-level lock from JS, this is "best-
 * effort serialised": two concurrent +1 calls might race and one of
 * them ends up reading a stale value. For the manual-admin path that
 * race is essentially impossible (one operator clicking), so we
 * accept it instead of adding another RPC.
 */
export async function adjustStock(
  raw: z.infer<typeof adjustSchema>,
): Promise<AdjustResult> {
  // Inventory mutations are admin+manager — cashiers post sales
  // through the POS path which already has its own auth gate.
  await requireAdmin(["admin", "manager"]);
  const parsed = adjustSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { variantId, delta, reason } = parsed.data;

  const userClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  const admin = getSupabaseAdminClient();

  // Read current qty + product_id for the movement row.
  const { data: variant, error: readErr } = await admin
    .from("product_variants")
    // products(slug) rides along on the read this function already does,
    // so the storefront invalidation below costs no extra round-trip.
    .select("stock_qty, product_id, products(slug)")
    .eq("id", variantId)
    .maybeSingle();
  if (readErr || !variant) {
    return { ok: false, error: "Variant not found" };
  }

  const before = variant.stock_qty ?? 0;
  const after = before + delta;
  if (after < 0) {
    return { ok: false, error: `Adjustment would push stock to ${after}` };
  }

  const { error: updateErr } = await admin
    .from("product_variants")
    .update({ stock_qty: after })
    .eq("id", variantId);
  if (updateErr) {
    return { ok: false, error: updateErr.message };
  }

  await admin.from("stock_movements").insert({
    variant_id: variantId,
    product_id: variant.product_id,
    type: "adjustment",
    qty_change: delta,
    qty_before: before,
    qty_after: after,
    reference_type: "manual",
    reference_id: null,
    notes: reason || null,
    created_by: user?.id ?? null,
  });

  revalidatePath("/admin/stock");
  revalidatePath("/admin");
  revalidateProduct(
    (variant as { products?: { slug?: string | null } | null }).products?.slug,
  );
  return { ok: true, newQty: after };
}

// ─── Exact-quantity setters ──────────────────────────────────────────

const setSchema = z.object({
  variantId: z.uuid(),
  /** Absolute target, not a delta. */
  qty: z.number().int().min(0),
  reason: z.string().trim().max(200).optional(),
});

export type SetResult =
  | { ok: true; newQty: number; changed: boolean }
  | { ok: false; error: string };

/**
 * Set one variant to an exact quantity.
 *
 * The +/- buttons move stock one unit per click, which is fine for a
 * miscount and useless for a delivery — restocking a 200-unit line
 * would be 200 clicks. This takes the number Marco already knows and
 * derives the delta itself, so the movement ledger still records a
 * signed change and the audit trail matches what adjustStock writes.
 *
 * Setting a variant to the value it already holds is a no-op: no
 * update, and no zero-delta movement row cluttering the timeline.
 */
export async function setStock(
  raw: z.infer<typeof setSchema>,
): Promise<SetResult> {
  await requireAdmin(["admin", "manager"]);
  const parsed = setSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { variantId, qty, reason } = parsed.data;

  const userClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  const admin = getSupabaseAdminClient();
  const { data: variant, error: readErr } = await admin
    .from("product_variants")
    .select("stock_qty, product_id, products(slug)")
    .eq("id", variantId)
    .maybeSingle();
  if (readErr || !variant) {
    return { ok: false, error: "Variant not found" };
  }

  const before = variant.stock_qty ?? 0;
  if (before === qty) return { ok: true, newQty: qty, changed: false };

  const { error: updateErr } = await admin
    .from("product_variants")
    .update({ stock_qty: qty })
    .eq("id", variantId);
  if (updateErr) {
    return { ok: false, error: updateErr.message };
  }

  await admin.from("stock_movements").insert({
    variant_id: variantId,
    product_id: variant.product_id,
    type: "adjustment",
    qty_change: qty - before,
    qty_before: before,
    qty_after: qty,
    reference_type: "manual",
    reference_id: null,
    notes: reason || null,
    created_by: user?.id ?? null,
  });

  revalidatePath("/admin/stock");
  revalidatePath("/admin");
  revalidateProduct(
    (variant as { products?: { slug?: string | null } | null }).products?.slug,
  );
  return { ok: true, newQty: qty, changed: true };
}

const setManySchema = z.object({
  /** Capped at the 500 listStockRows itself returns — the caller can
      only ever be acting on rows it was shown. */
  variantIds: z.array(z.uuid()).min(1).max(500),
  qty: z.number().int().min(0),
  reason: z.string().trim().max(200).optional(),
});

export type SetManyResult =
  | { ok: true; changed: number; skipped: number }
  | { ok: false; error: string };

/**
 * Set every listed variant to the same quantity.
 *
 * This is the whole-collection lever: filter the stock table down to a
 * collection and take all of it out of stock (or put it back) in one
 * action, instead of walking 147 variants one at a time.
 *
 * The caller passes explicit ids rather than a filter to re-run here.
 * Re-deriving the set server-side would let rows that scrolled into
 * the filter between render and submit get caught in a change the
 * operator never saw — what you see listed is exactly what moves.
 *
 * Variants already at the target are skipped, so re-applying the same
 * number twice doesn't write a second batch of zero-delta movements.
 */
export async function setManyStock(
  raw: z.infer<typeof setManySchema>,
): Promise<SetManyResult> {
  await requireAdmin(["admin", "manager"]);
  const parsed = setManySchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { variantIds, qty, reason } = parsed.data;

  const userClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  const admin = getSupabaseAdminClient();
  const { data: variants, error: readErr } = await admin
    .from("product_variants")
    .select("id, stock_qty, product_id")
    .in("id", variantIds);
  if (readErr) {
    return { ok: false, error: readErr.message };
  }

  const moving = (variants ?? []).filter((v) => (v.stock_qty ?? 0) !== qty);
  if (moving.length === 0) {
    return { ok: true, changed: 0, skipped: variants?.length ?? 0 };
  }

  // Every row lands on the same value, so one filtered update covers the
  // batch. Chunked because a few hundred uuids in a query string is the
  // one place PostgREST's URL length actually bites.
  const CHUNK = 50;
  for (let i = 0; i < moving.length; i += CHUNK) {
    const slice = moving.slice(i, i + CHUNK);
    const { error } = await admin
      .from("product_variants")
      .update({ stock_qty: qty })
      .in(
        "id",
        slice.map((v) => v.id),
      );
    if (error) {
      return { ok: false, error: error.message };
    }
  }

  await admin.from("stock_movements").insert(
    moving.map((v) => ({
      variant_id: v.id,
      product_id: v.product_id,
      type: "adjustment" as const,
      qty_change: qty - (v.stock_qty ?? 0),
      qty_before: v.stock_qty ?? 0,
      qty_after: qty,
      reference_type: "manual",
      reference_id: null,
      notes: reason || null,
      created_by: user?.id ?? null,
    })),
  );

  revalidatePath("/admin/stock");
  revalidatePath("/admin");
  // A batch spans products by design, so there's no single slug to aim
  // at — sweep the product pages once after the whole batch.
  revalidateProduct();
  return { ok: true, changed: moving.length, skipped: (variants?.length ?? 0) - moving.length };
}
