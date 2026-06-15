import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { StockMovementType } from "@/lib/supabase/types";

/**
 * Deduct stock for a batch of items and write the corresponding rows
 * into `stock_movements`.
 *
 * Why per-item RPC calls rather than one bulk RPC: the `deduct_stock_atomic`
 * Postgres function takes a row-level lock on the variant — the lock
 * serialises concurrent sales of the SAME variant, which is exactly the
 * concurrency we care about. Looping in JS adds a few ms of round-trip
 * but lets us keep the SQL surface small and the lock scope tight.
 *
 * Failure handling. We pre-check stock for every item first (one read
 * round-trip) so the 99% "out of stock" case fails fast with no
 * side-effects. Once we start the deductions, if one fails part-way
 * through we DO NOT silently swallow it — we return the list of items
 * we already deducted, so the caller can:
 *   (a) cancel the order they just inserted, AND
 *   (b) restore the previously-deducted variants by inserting
 *       compensating `stock_movements` (a follow-up `restoreStock`
 *       helper, added when we need it; out-of-scope for this commit).
 *
 * The race-condition window is tiny — a few ms between the pre-check
 * read and the locked decrement — and matters only when two carts hit
 * the same variant at the same time. For the online store path the
 * caller (placeOrder) cancels the order on partial failure so the
 * customer sees an honest error rather than an oversold order.
 */
export type StockDeductItem = {
  variantId: string;
  productId: string;
  qty: number;
};

export type StockDeductResult =
  | { ok: true }
  | {
      ok: false;
      /** Items that already had stock decremented before the failure.
          Empty if the failure happened during pre-check. */
      deducted: StockDeductItem[];
      error: string;
    };

export async function deductStock(opts: {
  items: ReadonlyArray<StockDeductItem>;
  referenceType: "online_sale" | "pos_sale";
  referenceId: string;
  /** Auth user id of the actor performing the sale. Null for guest
      checkouts — they still get a stock_movement, just with NULL
      created_by. */
  createdBy?: string | null;
}): Promise<StockDeductResult> {
  const admin = getSupabaseAdminClient();
  const items = opts.items;
  if (items.length === 0) return { ok: true };

  // ─── 1. Pre-check stock ──────────────────────────────────────────
  // Catches the common "user added 5 but only 2 left" failure with no
  // side effects. Concurrent buys can still race past this but the
  // locked RPC below will catch them.
  const variantIds = Array.from(new Set(items.map((i) => i.variantId)));
  const { data: variants, error: readErr } = await admin
    .from("product_variants")
    .select("id, stock_qty")
    .in("id", variantIds);

  if (readErr) {
    return { ok: false, deducted: [], error: `Stock read failed: ${readErr.message}` };
  }

  // Sum requested qty per variant (an item list might include the same
  // variant twice if the cart was merged oddly — be defensive).
  const requested = new Map<string, number>();
  for (const it of items) {
    requested.set(it.variantId, (requested.get(it.variantId) ?? 0) + it.qty);
  }
  const stockMap = new Map(variants?.map((v) => [v.id, v.stock_qty ?? 0]));
  for (const [variantId, qty] of requested) {
    const available = stockMap.get(variantId) ?? 0;
    if (available < qty) {
      return {
        ok: false,
        deducted: [],
        error: `Insufficient stock for variant ${variantId} (have ${available}, need ${qty})`,
      };
    }
  }

  // ─── 2. Atomic decrement + ledger insert per item ────────────────
  const movementType: StockMovementType =
    opts.referenceType === "pos_sale" ? "pos_sale" : "online_sale";
  const deducted: StockDeductItem[] = [];
  for (const item of items) {
    const { error } = await admin.rpc("deduct_stock_atomic", {
      p_variant_id: item.variantId,
      p_qty: item.qty,
      p_reference_type: opts.referenceType,
      p_reference_id: opts.referenceId,
      p_created_by: opts.createdBy ?? null,
      p_movement_type: movementType,
    });
    if (error) {
      return {
        ok: false,
        deducted,
        error: error.message,
      };
    }
    deducted.push(item);
  }

  return { ok: true };
}
