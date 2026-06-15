"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { deductStock } from "@/lib/inventory/deduct-stock";
import {
  calcTotals,
  completeSaleSchema,
  type CompleteSaleInput,
} from "./schema";

export type CompleteSaleResult =
  | {
      ok: true;
      sale: {
        id: string;
        sale_number: string;
        subtotal: number;
        discount: number;
        total: number;
        paymentMethod: string;
        paymentRef: string | null;
        notes: string | null;
        createdAt: string;
        items: Array<{
          variantId: string;
          name: string;
          color: string | null;
          size: string | null;
          qty: number;
          unitPrice: number;
          lineTotal: number;
        }>;
        cashierName: string | null;
      };
    }
  | { ok: false; error: string };

function generateSaleNumber(): string {
  // POS-YYYY-XXXXXX. The DB has a UNIQUE constraint so two collisions
  // would just retry (handled below). 6 base36 chars = ~2B namespace.
  const year = new Date().getFullYear();
  const token = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `POS-${year}-${token}`;
}

/**
 * Server action invoked when the cashier hits "Complete sale".
 *
 * Flow:
 *   1. Validate input with Zod.
 *   2. Resolve the current user → staff row (cashier_id). Null OK —
 *      means the admin user isn't yet listed as staff; the sale still
 *      persists but the cashier column will be empty.
 *   3. Insert pos_sales (retrying on unique-constraint collision of
 *      sale_number — extremely rare but free to handle).
 *   4. Insert pos_sale_items.
 *   5. Call deduct_stock_atomic per item via the shared helper
 *      (`referenceType = "pos_sale"`).
 *   6. On any failure after step 3, roll back: delete items, delete
 *      sale. The cashier sees a clear error and the cart stays intact.
 *
 * Returns the full sale snapshot + items + cashier name so the
 * receipt modal can render without an extra round-trip.
 */
export async function completeSale(
  raw: CompleteSaleInput,
): Promise<CompleteSaleResult> {
  const parsed = completeSaleSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid sale data",
    };
  }
  const { items, paymentMethod, discountAmount, paymentRef, notes } = parsed.data;
  const totals = calcTotals(items, discountAmount);

  // Resolve cashier — staff row matching the current authenticated user.
  const userClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  const admin = getSupabaseAdminClient();
  let cashierId: string | null = null;
  let cashierName: string | null = null;
  if (user) {
    const { data: staffRow } = await admin
      .from("staff")
      .select("id, name")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();
    if (staffRow) {
      cashierId = staffRow.id;
      cashierName = staffRow.name;
    }
  }

  // Insert sale (with up-to-3 retries on sale_number collision).
  let saleId: string | null = null;
  let saleNumber = "";
  let createdAt = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    saleNumber = generateSaleNumber();
    const { data: sale, error: saleErr } = await admin
      .from("pos_sales")
      .insert({
        sale_number: saleNumber,
        cashier_id: cashierId,
        subtotal: totals.subtotal,
        discount_amount: totals.discount,
        total: totals.total,
        payment_method: paymentMethod,
        payment_ref: paymentRef || null,
        notes: notes || null,
      })
      .select("id, sale_number, created_at")
      .single();
    if (!saleErr && sale) {
      saleId = sale.id;
      saleNumber = sale.sale_number;
      createdAt = sale.created_at;
      break;
    }
    if (saleErr?.code === "23505" && attempt < 2) continue;
    return {
      ok: false,
      error: `Failed to create sale: ${saleErr?.message ?? "unknown"}`,
    };
  }
  if (!saleId) {
    return { ok: false, error: "Could not generate a unique sale number" };
  }

  // Insert items.
  const { error: itemsErr } = await admin.from("pos_sale_items").insert(
    items.map((i) => ({
      sale_id: saleId,
      variant_id: i.variantId,
      product_id: i.productId,
      qty: i.qty,
      unit_price: i.unitPrice,
      snapshot_name: i.snapshotName,
      snapshot_color: i.snapshotColor ?? null,
      snapshot_size: i.snapshotSize ?? null,
    })),
  );
  if (itemsErr) {
    await admin.from("pos_sales").delete().eq("id", saleId);
    return {
      ok: false,
      error: `Failed to save items: ${itemsErr.message}`,
    };
  }

  // Deduct stock + log movement per item.
  const deduct = await deductStock({
    items: items.map((i) => ({
      variantId: i.variantId,
      productId: i.productId,
      qty: i.qty,
    })),
    referenceType: "pos_sale",
    referenceId: saleId,
    createdBy: user?.id ?? null,
  });
  if (!deduct.ok) {
    // Roll back the sale + items. Stock-movement rows from any
    // already-deducted variants stay in the ledger (intentionally —
    // the admin needs a clean audit trail of the attempted decrements).
    // The variant rows themselves are inconsistent until manually
    // restored; Step 6 (stock management) will surface this case.
    await admin.from("pos_sale_items").delete().eq("sale_id", saleId);
    await admin.from("pos_sales").delete().eq("id", saleId);
    return { ok: false, error: deduct.error };
  }

  // Revalidate the dashboard so the new sale shows up in "Recent POS"
  // and bumps the day's revenue card.
  revalidatePath("/admin");

  return {
    ok: true,
    sale: {
      id: saleId,
      sale_number: saleNumber,
      subtotal: totals.subtotal,
      discount: totals.discount,
      total: totals.total,
      paymentMethod,
      paymentRef: paymentRef || null,
      notes: notes || null,
      createdAt,
      items: items.map((i) => ({
        variantId: i.variantId,
        name: i.snapshotName,
        color: i.snapshotColor ?? null,
        size: i.snapshotSize ?? null,
        qty: i.qty,
        unitPrice: i.unitPrice,
        lineTotal: i.qty * i.unitPrice,
      })),
      cashierName,
    },
  };
}
