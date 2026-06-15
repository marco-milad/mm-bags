"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
    .select("stock_qty, product_id")
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
  return { ok: true, newQty: after };
}
