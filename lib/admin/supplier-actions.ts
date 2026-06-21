"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/auth";
import type { PurchaseOrderStatus } from "@/lib/supabase/types";

// ─── Suppliers ───────────────────────────────────────────────────────
const supplierSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(30).optional(),
  address: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(500).optional(),
});

export async function saveSupplier(formData: FormData): Promise<void> {
  await requireAdmin(["admin", "manager"]);
  const parsed = supplierSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
    address: formData.get("address") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return;
  const admin = getSupabaseAdminClient();
  const { id, ...rest } = parsed.data;
  if (id) {
    await admin.from("suppliers").update(rest).eq("id", id);
  } else {
    await admin.from("suppliers").insert(rest);
  }
  revalidatePath("/admin/suppliers");
}

export async function toggleSupplierActive(id: string): Promise<void> {
  await requireAdmin(["admin", "manager"]);
  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from("suppliers")
    .select("is_active")
    .eq("id", id)
    .maybeSingle();
  if (!data) return;
  await admin
    .from("suppliers")
    .update({ is_active: !data.is_active })
    .eq("id", id);
  revalidatePath("/admin/suppliers");
}

// ─── Purchase orders ────────────────────────────────────────────────
const purchaseOrderItemSchema = z.object({
  variantId: z.uuid(),
  productId: z.uuid(),
  qty: z.number().int().positive(),
  unitCost: z.number().nonnegative(),
});

const createPurchaseOrderSchema = z.object({
  supplierId: z.uuid(),
  items: z.array(purchaseOrderItemSchema).min(1),
  amountPaid: z.number().nonnegative().default(0),
  notes: z.string().trim().max(500).optional(),
});

type CreatePOResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function createPurchaseOrder(
  raw: z.input<typeof createPurchaseOrderSchema>,
): Promise<CreatePOResult> {
  await requireAdmin(["admin", "manager"]);
  const parsed = createPurchaseOrderSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { supplierId, items, amountPaid, notes } = parsed.data;

  const totalCost = items.reduce((s, i) => s + i.qty * i.unitCost, 0);
  const amountOwed = Math.max(0, totalCost - amountPaid);
  const status =
    amountOwed === 0
      ? "paid"
      : amountPaid > 0
        ? "partial"
        : "pending";

  const userClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  const admin = getSupabaseAdminClient();
  const { data: po, error: poErr } = await admin
    .from("purchase_orders")
    .insert({
      supplier_id: supplierId,
      total_cost: totalCost,
      amount_paid: amountPaid,
      amount_owed: amountOwed,
      status,
      notes: notes || null,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();
  if (poErr || !po) {
    return { ok: false, error: poErr?.message ?? "Insert failed" };
  }

  const { error: itemsErr } = await admin.from("purchase_order_items").insert(
    items.map((i) => ({
      purchase_order_id: po.id,
      product_id: i.productId,
      variant_id: i.variantId,
      qty: i.qty,
      unit_cost: i.unitCost,
    })),
  );
  if (itemsErr) {
    await admin.from("purchase_orders").delete().eq("id", po.id);
    return { ok: false, error: itemsErr.message };
  }

  // Roll the payment into the supplier's running totals.
  if (amountPaid > 0) {
    await bumpSupplierTotals(supplierId, amountPaid);
  }
  if (amountOwed > 0) {
    await addOwedToSupplier(supplierId, amountOwed);
  }

  revalidatePath("/admin/purchase-orders");
  revalidatePath("/admin/suppliers");
  return { ok: true, id: po.id };
}

/**
 * Mark a PO as received — bumps variant stock + writes purchase_in
 * stock_movements per item. Idempotent on status (no-ops if already
 * received).
 */
export async function markPurchaseOrderReceived(poId: string): Promise<void> {
  await requireAdmin(["admin", "manager"]);
  const admin = getSupabaseAdminClient();
  const { data: po } = await admin
    .from("purchase_orders")
    .select("id, status")
    .eq("id", poId)
    .maybeSingle();
  if (!po || po.status === "received" || po.status === "paid") return;

  const { data: items } = await admin
    .from("purchase_order_items")
    .select("id, product_id, variant_id, qty")
    .eq("purchase_order_id", poId);

  const userClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  for (const it of items ?? []) {
    if (!it.variant_id) continue;
    const { data: variant } = await admin
      .from("product_variants")
      .select("stock_qty")
      .eq("id", it.variant_id)
      .maybeSingle();
    const before = variant?.stock_qty ?? 0;
    const after = before + it.qty;
    await admin
      .from("product_variants")
      .update({ stock_qty: after })
      .eq("id", it.variant_id);
    await admin.from("stock_movements").insert({
      variant_id: it.variant_id,
      product_id: it.product_id,
      type: "purchase_in",
      qty_change: it.qty,
      qty_before: before,
      qty_after: after,
      reference_type: "purchase_order",
      reference_id: poId,
      created_by: user?.id ?? null,
    });
  }

  // Only flip to "received" — payment side stays whatever it was.
  // A fully-paid PO that's just received goes to 'paid' once owed=0.
  const { data: refreshed } = await admin
    .from("purchase_orders")
    .select("amount_owed")
    .eq("id", poId)
    .maybeSingle();
  await admin
    .from("purchase_orders")
    .update({ status: refreshed?.amount_owed === 0 ? "paid" : "received" })
    .eq("id", poId);

  revalidatePath("/admin/purchase-orders");
  revalidatePath(`/admin/purchase-orders/${poId}`);
  revalidatePath("/admin/stock");
}

export async function recordPurchaseOrderPayment(
  poId: string,
  amount: number,
): Promise<void> {
  await requireAdmin(["admin", "manager"]);
  if (!Number.isFinite(amount) || amount <= 0) return;
  const admin = getSupabaseAdminClient();
  const { data: po } = await admin
    .from("purchase_orders")
    .select("supplier_id, amount_paid, amount_owed, status")
    .eq("id", poId)
    .maybeSingle();
  if (!po) return;
  const payment = Math.min(amount, po.amount_owed);
  const newPaid = po.amount_paid + payment;
  const newOwed = Math.max(0, po.amount_owed - payment);

  await admin
    .from("purchase_orders")
    .update({
      amount_paid: newPaid,
      amount_owed: newOwed,
      status: nextStatusAfterPayment(po.status, newOwed),
    })
    .eq("id", poId);

  if (po.supplier_id) {
    await bumpSupplierTotals(po.supplier_id, payment);
    await addOwedToSupplier(po.supplier_id, -payment);
  }

  revalidatePath("/admin/purchase-orders");
  revalidatePath(`/admin/purchase-orders/${poId}`);
  revalidatePath("/admin/suppliers");
}

/**
 * Where the PO should land after a payment is applied. Three branches:
 *   1. Fully paid → "paid", regardless of receive state. The previous
 *      goods-in flow stays valid: a paid-but-unreceived PO still ages
 *      until Mark Received runs.
 *   2. Goods received, balance remaining → keep "received". The
 *      received milestone is sticky; partial payments don't undo it.
 *   3. Default (pending or partial with goods not yet received) →
 *      "partial".
 *
 * Extracted because the original nested ternary collapsed several
 * cases into the same outcome, which made it look broken even though
 * it wasn't.
 */
function nextStatusAfterPayment(
  currentStatus: PurchaseOrderStatus | null,
  newOwed: number,
): PurchaseOrderStatus {
  if (newOwed === 0) return "paid";
  if (currentStatus === "received") return "received";
  return "partial";
}

/**
 * Cancel a PO that hasn't been received yet. Pending POs are the only
 * cancel-safe state — once goods are in, the cancellation would need
 * to reverse stock movements (a separate "Return to supplier" flow we
 * don't ship in this commit). Hard-deletes the row + child items;
 * `purchase_order_items` has ON DELETE CASCADE.
 *
 * Also unwinds any up-front payment so the supplier's balance stays
 * honest: a pending PO with `amount_paid > 0` (rare but possible)
 * gets its credit returned to the supplier's running totals.
 */
export async function cancelPurchaseOrder(poId: string): Promise<void> {
  await requireAdmin(["admin", "manager"]);
  const admin = getSupabaseAdminClient();
  const { data: po } = await admin
    .from("purchase_orders")
    .select("status, supplier_id, amount_paid, amount_owed")
    .eq("id", poId)
    .maybeSingle();
  if (!po || po.status !== "pending") return;

  if (po.supplier_id) {
    if (po.amount_paid > 0) {
      // Reverse the cash-in: the supplier didn't sell us anything in
      // the end, so any payment captured up-front is no longer owed
      // to them.
      await bumpSupplierTotals(po.supplier_id, -po.amount_paid);
    }
    if (po.amount_owed > 0) {
      await addOwedToSupplier(po.supplier_id, -po.amount_owed);
    }
  }

  await admin.from("purchase_orders").delete().eq("id", poId);

  revalidatePath("/admin/purchase-orders");
  revalidatePath("/admin/suppliers");
}

export async function cancelPurchaseOrderForm(
  formData: FormData,
): Promise<void> {
  await requireAdmin(["admin", "manager"]);
  const id = formData.get("id");
  if (typeof id === "string") {
    await cancelPurchaseOrder(id);
    redirect("/admin/purchase-orders");
  }
}

// ─── Supplier total helpers ─────────────────────────────────────────
async function bumpSupplierTotals(
  supplierId: string,
  paymentDelta: number,
): Promise<void> {
  if (paymentDelta === 0) return;
  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from("suppliers")
    .select("total_paid")
    .eq("id", supplierId)
    .maybeSingle();
  if (!data) return;
  await admin
    .from("suppliers")
    .update({ total_paid: (data.total_paid ?? 0) + paymentDelta })
    .eq("id", supplierId);
}

async function addOwedToSupplier(
  supplierId: string,
  owedDelta: number,
): Promise<void> {
  if (owedDelta === 0) return;
  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from("suppliers")
    .select("total_owed")
    .eq("id", supplierId)
    .maybeSingle();
  if (!data) return;
  await admin
    .from("suppliers")
    .update({
      total_owed: Math.max(0, (data.total_owed ?? 0) + owedDelta),
    })
    .eq("id", supplierId);
}

// ─── Server-action-friendly wrappers for form posts ─────────────────
export async function createPurchaseOrderForm(formData: FormData): Promise<void> {
  await requireAdmin(["admin", "manager"]);
  const raw = formData.get("payload");
  if (typeof raw !== "string") return;
  let parsed: z.input<typeof createPurchaseOrderSchema>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return;
  }
  const res = await createPurchaseOrder(parsed);
  if (res.ok) {
    redirect(`/admin/purchase-orders/${res.id}`);
  }
}

export async function markReceivedForm(formData: FormData): Promise<void> {
  await requireAdmin(["admin", "manager"]);
  const id = formData.get("id");
  if (typeof id === "string") await markPurchaseOrderReceived(id);
}

export async function recordPaymentForm(formData: FormData): Promise<void> {
  await requireAdmin(["admin", "manager"]);
  const id = formData.get("id");
  const amount = Number(formData.get("amount"));
  if (typeof id === "string") await recordPurchaseOrderPayment(id, amount);
}
