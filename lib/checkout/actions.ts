"use server";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { deductStockBulk } from "@/lib/inventory/deduct-stock";
import { revalidateProduct } from "@/lib/cache/revalidate-public";
import { EG_GOVERNORATES } from "./governorates";
import { validateCart, type ValidateCartResult } from "./validate-cart";
import {
  calcTotals,
  placeOrderInputSchema,
  type PlaceOrderErrorCode,
  type PlaceOrderInput,
  type RepricedLine,
} from "./schema";

export type PlaceOrderResult =
  | { ok: true; orderId: string; orderNumber: string }
  | {
      ok: false;
      code: PlaceOrderErrorCode;
      error: string;
      /** Fresh authoritative prices to apply to the cart (PRICE_CHANGED). */
      reprice?: RepricedLine[];
    };

// placeOrder has no locale (it's called from both AR and EN checkout with
// the same payload), so — following this file's existing InstaPay-rejection
// precedent — user-facing errors carry both languages. This does NOT touch
// the H3 i18n item; it just keeps the new error strings consistent with the
// one already here.
function messageForError(
  outcome: Exclude<ValidateCartResult, { ok: true }>,
): string {
  const name = "productName" in outcome ? outcome.productName?.ar : undefined;
  switch (outcome.code) {
    case "VARIANT_NOT_FOUND":
    case "PRODUCT_UNAVAILABLE":
      return name
        ? `المنتج "${name}" لم يعد متاحًا. راجع سلتك من فضلك. / "${name}" is no longer available. Please review your cart.`
        : "أحد المنتجات في سلتك لم يعد متاحًا. راجع سلتك من فضلك. / An item in your cart is no longer available. Please review your cart.";
    case "INVALID_QUANTITY":
      return "الكمية المطلوبة غير صحيحة. / The requested quantity is invalid.";
    case "INSUFFICIENT_STOCK": {
      const available = "available" in outcome ? outcome.available : undefined;
      const stockText =
        typeof available === "number"
          ? ` (المتاح: ${available} / available: ${available})`
          : "";
      return name
        ? `الكمية المطلوبة من "${name}" مش متوفرة${stockText}. / Not enough stock for "${name}"${stockText}.`
        : `الكمية المطلوبة مش متوفرة${stockText}. / Not enough stock${stockText}.`;
    }
    case "PRICE_CHANGED":
      return "أسعار بعض المنتجات اتغيّرت. حدّثنا سلتك بالأسعار الجديدة — راجع الإجمالي وأكّد الطلب تاني. / Some prices have changed. We've updated your cart — please review the new total and place the order again.";
    case "CHECKOUT_FAILED":
    default:
      return "حصلت مشكلة أثناء تنفيذ الطلب. حاول تاني. / Something went wrong placing your order. Please try again.";
  }
}

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
    return {
      ok: false,
      code: "INVALID_CART",
      error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة",
    };
  }
  const { checkout, items } = parsed.data;

  // InstaPay is only offered when a real transfer handle is configured.
  // The checkout UI already hides the option, but a hand-crafted request
  // could still submit it — refuse rather than create an order the
  // customer has no way to pay.
  if (
    checkout.paymentMethod === "instapay" &&
    !process.env.NEXT_PUBLIC_INSTAPAY_HANDLE?.trim()
  ) {
    console.warn(
      "[placeOrder] Rejected instapay order — NEXT_PUBLIC_INSTAPAY_HANDLE is not configured.",
    );
    // placeOrder doesn't receive the locale, so this rare misconfig
    // error carries both languages rather than guessing.
    return {
      ok: false,
      code: "CHECKOUT_FAILED",
      error:
        "الدفع عبر InstaPay غير متاح حالياً — اختار الدفع عند الاستلام. / InstaPay is currently unavailable — please choose Cash on Delivery.",
    };
  }

  // ─── Server-authoritative validation (H2) ────────────────────────────
  // Re-derive every line from the DB: existence, availability, stock, and
  // price. The client-supplied unitPrice is NEVER trusted for money — the
  // totals and order_items below are built entirely from `validation.lines`.
  const validation = await validateCart(items);
  if (!validation.ok) {
    return {
      ok: false,
      code: validation.code,
      error: messageForError(validation),
      ...(validation.code === "PRICE_CHANGED"
        ? { reprice: validation.reprice }
        : {}),
    };
  }

  // Totals are computed from the authoritative DB prices, not the client's.
  const totals = calcTotals(validation.lines, checkout.paymentMethod);
  // Fast lookup of the authoritative unit price per variant for order_items.
  const authoritativePrice = new Map(
    validation.lines.map((l) => [l.variantId, l.unitPrice]),
  );

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
      console.error("[placeOrder] order insert failed:", orderErr.message);
      return {
        ok: false,
        code: "CHECKOUT_FAILED",
        error: messageForError({ ok: false, code: "CHECKOUT_FAILED" }),
      };
    }

    const { error: itemsErr } = await admin.from("order_items").insert(
      items.map((line) => ({
        order_id: order.id,
        variant_id: line.variantId,
        product_id: line.productId,
        qty: line.qty,
        // Authoritative DB price — never the client's unitPrice.
        unit_price: authoritativePrice.get(line.variantId)!,
        snapshot_name: line.name_ar,
        snapshot_image: line.image,
      })),
    );

    if (itemsErr) {
      // Rollback the order so we don't leave an orphan.
      await admin.from("orders").delete().eq("id", order.id);
      console.error("[placeOrder] order_items insert failed:", itemsErr.message);
      return {
        ok: false,
        code: "CHECKOUT_FAILED",
        error: messageForError({ ok: false, code: "CHECKOUT_FAILED" }),
      };
    }

    // ─── Stock deduction (all-or-nothing, one transaction) ────────────────
    // Runs AFTER order_items insert so the ledger reference_id points at a
    // real order row. deductStockBulk deducts EVERY line in a single DB
    // transaction: either all succeed or none does. So on failure NOTHING
    // was decremented and cancelling the order leaves no stock leak — no
    // partial-deduction reconciliation is ever needed. This path only trips
    // if a concurrent buy took the stock in the gap after validateCart.
    const deductResult = await deductStockBulk({
      items: validation.lines.map((line) => ({
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
      console.error("[placeOrder] bulk stock deduction failed:", deductResult.error);
      return {
        ok: false,
        code: "INSUFFICIENT_STOCK",
        error:
          "أحد المنتجات خلص من المخزون للتو. راجع سلتك من فضلك. / An item just went out of stock. Please review your cart.",
      };
    }

    // Stock just moved for every line in this order. The cart carries
    // ids, not slugs, so invalidate the product pages as a set rather
    // than adding a lookup to the purchase path.
    revalidateProduct();

    return { ok: true, orderId: order.id, orderNumber: order.order_number };
  }

  return {
    ok: false,
    code: "CHECKOUT_FAILED",
    error: "تعذّر توليد رقم طلب فريد. جرّب تاني. / Couldn't generate a unique order number. Please try again.",
  };
}
