"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/auth";
import {
  createPosReturnSchema,
  RETURN_REFERENCE_TYPE_POS,
  type CreatePosReturnInput,
  type ReturnActionResult,
} from "@/lib/returns/shared";
import {
  findPosSalesForReturn,
  getReturnableQuantitiesForPosSale,
  type PosSaleSearchFilters,
  type PosSaleSearchResult,
  type ReturnablePosLine,
} from "@/lib/queries/admin-pos-returns";

/**
 * Server action: register a POS return against a previously rung-up
 * sale. Mirrors `createOrderReturn` for online orders but talks to
 * the `pos_sales` / `pos_sale_items` / `pos_returns` /
 * `pos_return_items` family of tables.
 *
 * Flow:
 *   1. requireAdmin (cashier+ — the till staff who originally rang
 *      up the sale can also process the return).
 *   2. Validate via zod.
 *   3. Resolve the current user → cashier_id.
 *   4. Idempotency / over-return guard: load every existing
 *      pos_return_items row pointing at the same sale's items, plus
 *      the original pos_sale_items, and reject if requested qty +
 *      already-returned > sold.
 *   5. Insert pos_returns header + pos_return_items lines.
 *   6. For each line, call `restock_atomic` so the variant stock is
 *      bumped back up AND a stock_movements ledger row is written
 *      under the same lock.
 *   7. Update the denormalised `has_returns` / `returns_total`
 *      columns on pos_sales so the POS dashboard + reports don't
 *      have to aggregate at read time.
 *   8. Revalidate the affected admin paths.
 */
export async function createPosReturn(
  raw: CreatePosReturnInput,
): Promise<ReturnActionResult> {
  // ─── 1. Auth ──────────────────────────────────────────────────────
  try {
    await requireAdmin(["admin", "manager", "cashier"]);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "UNAUTHORIZED",
    };
  }

  // ─── 2. Validate ──────────────────────────────────────────────────
  const parsed = createPosReturnSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "_";
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ?? "البيانات اللي اتبعتت مش مكتملة.",
      fieldErrors,
    };
  }
  const { saleId, items, reason, refundMethod, refundAmount, notes } =
    parsed.data;

  // ─── 3. Resolve cashier ───────────────────────────────────────────
  const userClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  const admin = getSupabaseAdminClient();

  let cashierId: string | null = null;
  if (user) {
    const { data: staffRow } = await admin
      .from("staff")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();
    if (staffRow) cashierId = staffRow.id;
  }

  // ─── 4. Idempotency guard ─────────────────────────────────────────
  // Load all sale_items for the sale to validate ownership + sold qty.
  const { data: saleItemsRaw, error: saleItemsErr } = await admin
    .from("pos_sale_items")
    .select("id, qty, sale_id, variant_id, product_id")
    .eq("sale_id", saleId);
  if (saleItemsErr) {
    return {
      ok: false,
      error: `فشل التحقق من أصناف البيعة: ${saleItemsErr.message}`,
    };
  }
  if (!saleItemsRaw || saleItemsRaw.length === 0) {
    return { ok: false, error: "البيعة دي مفيهاش أصناف." };
  }

  // Build qty-sold map keyed by sale_item.id.
  const soldQtyByItemId = new Map<string, number>();
  for (const si of saleItemsRaw) {
    soldQtyByItemId.set(si.id, si.qty);
  }

  // Pull every prior return-item row pointing at any of this sale's
  // line items so we can sum already-returned qty.
  const saleItemIds = saleItemsRaw.map((s) => s.id);
  const { data: priorReturns, error: priorErr } = await admin
    .from("pos_return_items")
    .select("sale_item_id, qty")
    .in("sale_item_id", saleItemIds);
  if (priorErr) {
    return {
      ok: false,
      error: `فشل تحميل المرتجعات السابقة: ${priorErr.message}`,
    };
  }
  const alreadyReturnedByItemId = new Map<string, number>();
  for (const r of priorReturns ?? []) {
    if (!r.sale_item_id) continue;
    alreadyReturnedByItemId.set(
      r.sale_item_id,
      (alreadyReturnedByItemId.get(r.sale_item_id) ?? 0) + r.qty,
    );
  }

  // Validate each requested line.
  for (const line of items) {
    const sold = soldQtyByItemId.get(line.sourceItemId);
    if (sold === undefined) {
      return {
        ok: false,
        error: "في صنف مش تابع للبيعة دي — اعمل refresh وحاول تاني.",
      };
    }
    const already = alreadyReturnedByItemId.get(line.sourceItemId) ?? 0;
    const remaining = sold - already;
    if (line.qty > remaining) {
      return {
        ok: false,
        error: `مينفعش ترجّع ${line.qty} — فاضل ${remaining} بس من الصنف ده.`,
      };
    }
  }

  // ─── 5. Insert return header + items ──────────────────────────────
  const { data: returnRow, error: insertHeaderErr } = await admin
    .from("pos_returns")
    .insert({
      sale_id: saleId,
      reason,
      refund_method: refundMethod,
      refund_amount: refundAmount,
      notes: notes ?? null,
      cashier_id: cashierId,
    })
    .select("id")
    .single();
  if (insertHeaderErr || !returnRow) {
    return {
      ok: false,
      error: `فشل تسجيل الإرجاع: ${insertHeaderErr?.message ?? "غير معروف"}`,
    };
  }
  const returnId = returnRow.id;

  const { error: insertItemsErr } = await admin
    .from("pos_return_items")
    .insert(
      items.map((i) => ({
        return_id: returnId,
        sale_item_id: i.sourceItemId,
        product_id: i.productId,
        variant_id: i.variantId,
        qty: i.qty,
        unit_price: i.unitPrice,
      })),
    );
  if (insertItemsErr) {
    // Roll back the header so we don't leak a partial return.
    await admin.from("pos_returns").delete().eq("id", returnId);
    return {
      ok: false,
      error: `فشل حفظ أصناف الإرجاع: ${insertItemsErr.message}`,
    };
  }

  // ─── 6. Restock atomically per line ───────────────────────────────
  for (const line of items) {
    const { error: stockErr } = await admin.rpc("restock_atomic", {
      p_variant_id: line.variantId,
      p_qty: line.qty,
      p_reference_type: RETURN_REFERENCE_TYPE_POS,
      p_reference_id: returnId,
      p_created_by: user?.id ?? null,
      p_movement_type: "return",
      p_notes: notes ?? null,
    });
    if (stockErr) {
      // Best-effort rollback: delete the inserted return rows. Any
      // restock_atomic calls that succeeded BEFORE this one have
      // already mutated stock + ledger — that's intentional, the
      // audit trail must reflect what physically happened.
      await admin.from("pos_return_items").delete().eq("return_id", returnId);
      await admin.from("pos_returns").delete().eq("id", returnId);
      return {
        ok: false,
        error: `فشل إعادة المخزون: ${stockErr.message}`,
      };
    }
  }

  // ─── 7. Update denormalised totals on pos_sales ───────────────────
  const { data: saleNow } = await admin
    .from("pos_sales")
    .select("returns_total")
    .eq("id", saleId)
    .maybeSingle();
  const newReturnsTotal = (saleNow?.returns_total ?? 0) + refundAmount;
  await admin
    .from("pos_sales")
    .update({
      has_returns: true,
      returns_total: newReturnsTotal,
    })
    .eq("id", saleId);

  // ─── 8. Revalidate ────────────────────────────────────────────────
  revalidatePath("/admin/pos/returns");
  revalidatePath("/admin/pos");
  revalidatePath("/admin/orders");
  revalidatePath("/admin");

  return { ok: true, returnId, refundAmount };
}

/**
 * Server-action wrapper around `findPosSalesForReturn`. The query
 * helper itself lives in a `"server-only"` module so client
 * components MUST go through this action instead of importing it
 * directly — otherwise Next would pull the supabase admin client
 * into the browser bundle.
 *
 * Accepts an optional `query` (sale_number ilike) and an optional
 * `date` (YYYY-MM-DD, interpreted in Cairo time). Either or both —
 * if both empty, returns []. See findPosSalesForReturn for the
 * matching rules.
 */
export async function searchPosSalesForReturn(
  filters: PosSaleSearchFilters,
): Promise<PosSaleSearchResult[]> {
  try {
    await requireAdmin(["admin", "manager", "cashier"]);
  } catch {
    return [];
  }
  const q = filters.query?.trim() ?? "";
  const d = filters.date?.trim() ?? "";
  if (!q && !d) return [];
  return findPosSalesForReturn({ query: q || undefined, date: d || undefined });
}

export type LoadReturnableSaleResult =
  | {
      ok: true;
      sale: {
        id: string;
        saleNumber: string;
        createdAt: string;
        total: number;
        paymentMethod: string;
      };
      lines: ReturnablePosLine[];
    }
  | { ok: false; error: string };

/**
 * Server-action wrapper around `getReturnableQuantitiesForPosSale`
 * — keeps the supabase admin client out of the client bundle.
 */
export async function loadReturnableSale(
  saleId: string,
): Promise<LoadReturnableSaleResult> {
  try {
    await requireAdmin(["admin", "manager", "cashier"]);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "UNAUTHORIZED",
    };
  }
  const data = await getReturnableQuantitiesForPosSale(saleId);
  if (!data) return { ok: false, error: "البيعة دي مش موجودة." };
  return { ok: true, sale: data.sale, lines: data.lines };
}
