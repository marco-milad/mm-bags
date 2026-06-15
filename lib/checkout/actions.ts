"use server";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { deductStock } from "@/lib/inventory/deduct-stock";
import { EG_GOVERNORATES } from "./governorates";
import {
  calcTotals,
  placeOrderInputSchema,
  type PlaceOrderInput,
} from "./schema";

export type PlaceOrderResult =
  | { ok: true; orderId: string; orderNumber: string }
  | { ok: false; error: string };

function generateOrderNumber(): string {
  // MM-YYYY-XXXXXX, base36 short token. Collision-resistant enough for a
  // demo; the DB UNIQUE constraint on order_number will reject duplicates.
  const year = new Date().getFullYear();
  const token = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `MM-${year}-${token}`;
}

export async function placeOrder(
  rawInput: PlaceOrderInput,
): Promise<PlaceOrderResult> {
  const parsed = placeOrderInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };
  }
  const { checkout, items } = parsed.data;
  const totals = calcTotals(items, checkout.paymentMethod);

  // Capture the current user (may be null for guest checkout).
  const supabaseUser = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabaseUser.auth.getUser();

  const governorate = EG_GOVERNORATES.find((g) => g.code === checkout.governorate);
  const shippingAddress = {
    name: checkout.name,
    phone: checkout.phone,
    email: checkout.email || null,
    governorate: governorate?.name_ar ?? checkout.governorate,
    governorate_code: checkout.governorate,
    city: checkout.city,
    street: checkout.street,
    building: checkout.building || null,
    notes: checkout.notes || null,
  };

  // Use admin client to bypass RLS for guest orders (user_id = null).
  // Logged-in users still get their auth.uid() recorded.
  const admin = getSupabaseAdminClient();

  // Retry up to 3 times on order_number collisions before giving up.
  for (let attempt = 0; attempt < 3; attempt++) {
    const orderNumber = generateOrderNumber();
    const { data: order, error: orderErr } = await admin
      .from("orders")
      .insert({
        order_number: orderNumber,
        user_id: user?.id ?? null,
        guest_email: user ? null : checkout.email || null,
        guest_phone: user ? null : checkout.phone,
        status: "pending",
        payment_method: checkout.paymentMethod,
        payment_status: "pending",
        subtotal: totals.subtotal,
        shipping_fee: totals.shippingFee,
        discount_amount: 0,
        loyalty_discount: 0,
        total: totals.total,
        shipping_address: shippingAddress,
      })
      .select("id, order_number")
      .single();

    if (orderErr) {
      // 23505 = unique_violation (order_number collision). Retry.
      if (orderErr.code === "23505" && attempt < 2) continue;
      return { ok: false, error: `حصلت مشكلة في إنشاء الطلب: ${orderErr.message}` };
    }

    const { error: itemsErr } = await admin.from("order_items").insert(
      items.map((line) => ({
        order_id: order.id,
        variant_id: line.variantId,
        product_id: line.productId,
        qty: line.qty,
        unit_price: line.unitPrice,
        snapshot_name: line.name_ar,
        snapshot_image: line.image,
      })),
    );

    if (itemsErr) {
      // Rollback the order so we don't leave an orphan.
      await admin.from("orders").delete().eq("id", order.id);
      return {
        ok: false,
        error: `حصلت مشكلة في حفظ المنتجات: ${itemsErr.message}`,
      };
    }

    // ─── Stock deduction (atomic per variant, logged in stock_movements) ──
    // Runs AFTER order_items insert so the ledger reference_id points at
    // a real order row. On failure (insufficient stock surfaced by a
    // concurrent buy, or RPC error) we cancel the order — better the
    // customer sees an honest failure than an oversold confirmation.
    // Note: partial-deduction items remain decremented; an admin can
    // reconcile via /admin/stock (Step 6) using the stock_movements
    // ledger which captured every successful decrement.
    const deductResult = await deductStock({
      items: items.map((line) => ({
        variantId: line.variantId,
        productId: line.productId,
        qty: line.qty,
      })),
      referenceType: "online_sale",
      referenceId: order.id,
      createdBy: user?.id ?? null,
    });
    if (!deductResult.ok) {
      await admin.from("order_items").delete().eq("order_id", order.id);
      await admin.from("orders").delete().eq("id", order.id);
      return {
        ok: false,
        error: `المنتج خلص من المخزون. ${deductResult.error}`,
      };
    }

    return { ok: true, orderId: order.id, orderNumber: order.order_number };
  }

  return { ok: false, error: "تعذّر توليد رقم طلب فريد. جرّب تاني." };
}
