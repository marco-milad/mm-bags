"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/auth";
import {
  createOrderReturnSchema,
  RETURN_REFERENCE_TYPE_ONLINE,
  type CreateOrderReturnInput,
  type ReturnActionResult,
} from "@/lib/returns/shared";

/**
 * Online-order returns.
 *
 * createOrderReturn validates → inserts the parent + item rows →
 * fans out to restock_atomic per line (single RPC = single locked
 * write + ledger insert) → updates the denormalised has_returns +
 * returns_total counters on the order. A failure mid-way through the
 * RPC fan-out triggers a best-effort rollback of the just-written
 * return rows so the books stay consistent.
 *
 * Never throws to the caller — every failure mode returns
 * { ok:false, error } so the modal can render a banner instead of
 * the Next.js error overlay.
 */
export async function createOrderReturn(
  raw: CreateOrderReturnInput,
): Promise<ReturnActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Not authorised" };
  }

  const parsed = createOrderReturnSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      error: first?.message ?? "Invalid return payload",
    };
  }
  const input = parsed.data;

  // Resolve current user for created_by attribution.
  const userClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  const createdBy = user?.id ?? null;

  const admin = getSupabaseAdminClient();

  // 1. Sum existing returned qty per order_item_id for over-return guard.
  const { data: priorReturnsRaw, error: priorErr } = await admin
    .from("order_return_items")
    .select("order_item_id, qty, return:order_returns!inner(order_id)")
    .eq("return.order_id", input.orderId);
  if (priorErr) {
    return { ok: false, error: priorErr.message };
  }
  const alreadyReturned = new Map<string, number>();
  for (const row of (priorReturnsRaw ?? []) as Array<{
    order_item_id: string | null;
    qty: number;
  }>) {
    if (!row.order_item_id) continue;
    alreadyReturned.set(
      row.order_item_id,
      (alreadyReturned.get(row.order_item_id) ?? 0) + row.qty,
    );
  }

  // 2. Load the original order_items so we can validate variant/product
  //    identity + the qty cap.
  const { data: originalItemsRaw, error: itemsErr } = await admin
    .from("order_items")
    .select("id, qty, unit_price, variant_id, product_id")
    .eq("order_id", input.orderId);
  if (itemsErr) {
    return { ok: false, error: itemsErr.message };
  }
  const originalItems = new Map<
    string,
    {
      qty: number;
      unit_price: number;
      variant_id: string | null;
      product_id: string | null;
    }
  >();
  for (const it of (originalItemsRaw ?? []) as Array<{
    id: string;
    qty: number;
    unit_price: number;
    variant_id: string | null;
    product_id: string | null;
  }>) {
    originalItems.set(it.id, {
      qty: it.qty,
      unit_price: it.unit_price,
      variant_id: it.variant_id,
      product_id: it.product_id,
    });
  }

  // 3. Validate every requested line.
  const fieldErrors: Record<string, string> = {};
  for (const item of input.items) {
    const original = originalItems.get(item.sourceItemId);
    if (!original) {
      return {
        ok: false,
        error: `Item ${item.sourceItemId} is not part of this order`,
        fieldErrors: { [item.sourceItemId]: "not in order" },
      };
    }
    if (item.qty <= 0) {
      return {
        ok: false,
        error: `Item ${item.sourceItemId}: qty must be positive`,
        fieldErrors: { [item.sourceItemId]: "invalid qty" },
      };
    }
    const remaining = original.qty - (alreadyReturned.get(item.sourceItemId) ?? 0);
    if (item.qty > remaining) {
      return {
        ok: false,
        error: `Item ${item.sourceItemId}: requested ${item.qty} exceeds returnable ${remaining}`,
        fieldErrors: { [item.sourceItemId]: `max ${remaining}` },
      };
    }
    if (original.variant_id && original.variant_id !== item.variantId) {
      return {
        ok: false,
        error: `Item ${item.sourceItemId}: variant mismatch`,
        fieldErrors: { [item.sourceItemId]: "variant mismatch" },
      };
    }
    if (original.product_id && original.product_id !== item.productId) {
      return {
        ok: false,
        error: `Item ${item.sourceItemId}: product mismatch`,
        fieldErrors: { [item.sourceItemId]: "product mismatch" },
      };
    }
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: "Validation failed", fieldErrors };
  }

  // 4. Insert the parent return row.
  const { data: insertedReturn, error: returnErr } = await admin
    .from("order_returns")
    .insert({
      order_id: input.orderId,
      reason: input.reason,
      refund_method: input.refundMethod,
      refund_amount: input.refundAmount,
      notes: input.notes ?? null,
      created_by: createdBy,
    })
    .select("id")
    .single();
  if (returnErr || !insertedReturn) {
    return {
      ok: false,
      error: returnErr?.message ?? "Failed to create return record",
    };
  }
  const returnId = insertedReturn.id;

  // 5. Insert the children.
  const childRows = input.items.map((item) => ({
    return_id: returnId,
    order_item_id: item.sourceItemId,
    product_id: item.productId,
    variant_id: item.variantId,
    qty: item.qty,
    unit_price: item.unitPrice,
  }));
  const { error: itemsInsertErr } = await admin
    .from("order_return_items")
    .insert(childRows);
  if (itemsInsertErr) {
    await admin.from("order_returns").delete().eq("id", returnId);
    return { ok: false, error: itemsInsertErr.message };
  }

  // 6. Restock each variant atomically. Best-effort rollback on failure.
  for (const item of input.items) {
    const { error: rpcErr } = await admin.rpc("restock_atomic", {
      p_variant_id: item.variantId,
      p_qty: item.qty,
      p_reference_type: RETURN_REFERENCE_TYPE_ONLINE,
      p_reference_id: returnId,
      p_created_by: createdBy,
      p_movement_type: "return",
      p_notes: null,
    });
    if (rpcErr) {
      // Rollback the just-written rows. The restock_atomic that
      // succeeded for earlier lines stays — those moved stock and the
      // ledger entry must survive for the audit trail. The orphan
      // ledger rows reference a now-deleted return id and will surface
      // in reconciliation as a flag to investigate.
      await admin.from("order_return_items").delete().eq("return_id", returnId);
      await admin.from("order_returns").delete().eq("id", returnId);
      return { ok: false, error: rpcErr.message };
    }
  }

  // 7. Update denormalised order columns. Read-then-write because
  //    Postgres-side += on numeric is not exposed via supabase-js;
  //    the parent action is gated by requireAdmin so write conflicts
  //    are vanishingly rare in practice.
  const { data: orderCurrent } = await admin
    .from("orders")
    .select("returns_total")
    .eq("id", input.orderId)
    .maybeSingle();
  const newTotal =
    Number(orderCurrent?.returns_total ?? 0) + Number(input.refundAmount);
  await admin
    .from("orders")
    .update({ has_returns: true, returns_total: newTotal })
    .eq("id", input.orderId);

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${input.orderId}`);
  revalidatePath("/admin");

  return { ok: true, returnId, refundAmount: input.refundAmount };
}

/**
 * Form-action wrapper. The modal serialises its state to JSON in a
 * hidden "payload" input so we can keep the type-safe createOrderReturn
 * signature without converting every nested item field into a separate
 * FormData entry.
 */
export async function createOrderReturnForm(
  _prev: ReturnActionResult,
  formData: FormData,
): Promise<ReturnActionResult> {
  const raw = formData.get("payload");
  if (typeof raw !== "string") {
    return { ok: false, error: "Missing payload" };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Malformed payload" };
  }
  return createOrderReturn(parsed as CreateOrderReturnInput);
}
