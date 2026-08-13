"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/auth";
import { sendWhatsApp } from "@/lib/twilio";
import { buildPostDeliveryMessage } from "@/lib/reviews/post-delivery";
import type { Locale } from "@/lib/i18n-config";
import type { OrderStatus } from "@/lib/supabase/types";

const ORDER_STATUSES: ReadonlyArray<OrderStatus> = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

/**
 * Update an order's status from the admin orders list.
 *
 * When the new status is "delivered" we ALSO send the post-delivery
 * WhatsApp review prompt (same logic as /api/orders/[id]/mark-delivered,
 * inlined here so the action stays self-contained). Best-effort: if
 * Twilio isn't configured or the send fails, the status flip still
 * sticks and we log the failure.
 */
type ShippingAddressShape = {
  name?: string;
  phone?: string;
  locale?: Locale;
};

export async function updateOrderStatus(formData: FormData): Promise<void> {
  // Server Actions are addressable POST endpoints — the layout guard
  // doesn't protect them. Without this check any authenticated
  // visitor could update any order's status and trigger a paid
  // Twilio send. Let the throw bubble so a stale-cookie click surfaces
  // an explicit error in the admin UI instead of fail-open silence.
  await requireAdmin(["admin", "manager"]);

  const parsed = z
    .object({
      id: z.uuid(),
      status: z.enum(ORDER_STATUSES),
    })
    .safeParse({
      id: formData.get("id"),
      status: formData.get("status"),
    });
  if (!parsed.success) return;
  const { id, status } = parsed.data;
  const admin = getSupabaseAdminClient();

  // We need the shipping address + items for the WhatsApp send if we
  // end up transitioning into delivered. Read FIRST.
  const { data: beforeRaw } = await admin
    .from("orders")
    .select(
      "status, shipping_address, " +
      "items:order_items(product:products(slug))",
    )
    .eq("id", id)
    .maybeSingle();
  if (!beforeRaw) return;
  const before = beforeRaw as unknown as {
    status: string | null;
    shipping_address: unknown;
    items: Array<{
      product: { slug: string } | Array<{ slug: string }> | null;
    }> | null;
  };

  // Manual cancel of an UNPAID InstaPay order is blocked: the expiry
  // sweep (migration 0014) is the only path that cancels those,
  // because it restocks atomically in the same transaction. A plain
  // status write here would strand the deducted stock forever (there
  // is no app-side restock on cancel yet — Phase B).
  if (status === "cancelled") {
    const { data: target } = await admin
      .from("orders")
      .select("payment_method, payment_status")
      .eq("id", id)
      .maybeSingle();
    if (
      target?.payment_method === "instapay" &&
      target.payment_status === "pending"
    ) {
      console.warn(
        `[orders/${id}] manual cancel of unpaid InstaPay order refused — the expiry sweep cancels + restocks it atomically instead.`,
      );
      return;
    }
  }

  // Atomic transition: only one writer can flip `pending → delivered`
  // because the WHERE clause requires the old status to be different.
  // This collapses the previous read-then-write race that allowed
  // double-clicks to fire two WhatsApp messages.
  //
  // `.neq("status", "cancelled")` on every branch: a cancelled order
  // (admin cancel or InstaPay expiry — the latter already restocked)
  // must never be resurrected by the dropdown, because nothing would
  // re-deduct its stock.
  let transitionedToDelivered = false;
  if (status === "delivered") {
    const { data: updated } = await admin
      .from("orders")
      .update({ status })
      .eq("id", id)
      .neq("status", "delivered")
      .neq("status", "cancelled")
      .select("id")
      .maybeSingle();
    transitionedToDelivered = !!updated;
  } else {
    await admin
      .from("orders")
      .update({ status })
      .eq("id", id)
      .neq("status", "cancelled");
  }

  if (transitionedToDelivered) {
    await sendDeliveryWhatsAppBestEffort(id, {
      shipping_address: before.shipping_address,
      items: before.items,
    });
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin");
}

async function sendDeliveryWhatsAppBestEffort(
  orderId: string,
  raw: {
    shipping_address: unknown;
    items: unknown;
  },
): Promise<void> {
  const address = (raw.shipping_address ?? {}) as ShippingAddressShape;
  const phone = address.phone?.trim();
  const name = address.name?.trim();
  // Don't send a "Hi (generic)" greeting — skip rather than send an
  // anonymous message that looks like spam and risks WABA flagging.
  if (!phone || !name) return;
  const items = (raw.items ?? []) as Array<{
    product:
      | { slug: string }
      | Array<{ slug: string }>
      | null;
  }>;
  const firstSlug = items
    .map((it) => (Array.isArray(it.product) ? it.product[0]?.slug : it.product?.slug))
    .find(Boolean);
  if (!firstSlug) return;
  const locale: Locale = address.locale === "en" ? "en" : "ar";
  const body = buildPostDeliveryMessage({
    locale,
    name,
    productSlug: firstSlug,
  });
  const res = await sendWhatsApp({ to: phone, body });
  if (!res.ok) {
    console.warn(
      `[orders/${orderId}] WhatsApp post-delivery prompt failed:`,
      res.error,
    );
  }
}

// ─── COD tracking ────────────────────────────────────────────────────
const codSchema = z.object({
  orderId: z.uuid(),
  courierName: z.string().trim().max(60).optional(),
  trackingNumber: z.string().trim().max(60).optional(),
  currentStatus: z.string().trim().max(60).optional(),
  currentLocation: z.string().trim().max(100).optional(),
});

/**
 * Manually confirm that an InstaPay transfer has landed in Marco's
 * account for the given order. Flips payment_status to 'paid' and,
 * if the order is still 'pending' (never confirmed), advances it to
 * 'confirmed' so the normal fulfilment flow can pick it up.
 *
 * Constraints (defence-in-depth so this can't be misused):
 *   - Admin/manager only.
 *   - Only applies to orders whose payment_method is 'instapay' — a
 *     COD order's "paid" moment is the courier handover, not a
 *     manual admin click, and a card order (once Paymob lands) will
 *     have its payment_status flipped by the webhook, not by hand.
 *   - Requires payment_status to currently be 'pending'; refuses to
 *     re-flip a 'paid' order (idempotent) or reverse a 'refunded'.
 *   - No automatic side effects (no Twilio, no stock movement) —
 *     stock was already reserved at order creation, and the
 *     customer-facing WhatsApp send lives with the delivery flow.
 */
export async function markInstapayPaid(formData: FormData): Promise<void> {
  await requireAdmin(["admin", "manager"]);
  const parsed = z
    .object({ id: z.uuid() })
    .safeParse({ id: formData.get("id") });
  if (!parsed.success) return;
  const { id } = parsed.data;

  const admin = getSupabaseAdminClient();
  const { data: current } = await admin
    .from("orders")
    .select("payment_method, payment_status, status")
    .eq("id", id)
    .maybeSingle();
  if (!current) return;
  if (current.payment_method !== "instapay") return;
  if (current.payment_status !== "pending") return;
  // A cancelled order can't be confirmed as paid — its stock is gone
  // (expiry sweep restocked it). If a transfer arrives for one, that's
  // a manual support case, not a one-click confirm.
  if (current.status === "cancelled") return;

  // Bump the order status too when it's still 'pending' — the admin
  // has now taken the same action a courier's cash-on-delivery would
  // trigger, so the order can move into the fulfilment queue.
  const nextStatus =
    current.status === "pending" ? "confirmed" : current.status;

  await admin
    .from("orders")
    .update({
      payment_status: "paid",
      status: nextStatus,
    })
    .eq("id", id)
    .eq("payment_status", "pending") // race guard
    .neq("status", "cancelled"); // expiry sweep may have won the race

  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
}

export async function saveCodTracking(formData: FormData): Promise<void> {
  await requireAdmin(["admin", "manager"]);
  const parsed = codSchema.safeParse({
    orderId: formData.get("orderId"),
    courierName: formData.get("courierName") || undefined,
    trackingNumber: formData.get("trackingNumber") || undefined,
    currentStatus: formData.get("currentStatus") || undefined,
    currentLocation: formData.get("currentLocation") || undefined,
  });
  if (!parsed.success) return;
  const { orderId, ...rest } = parsed.data;
  const admin = getSupabaseAdminClient();
  await admin
    .from("cod_tracking")
    .upsert(
      {
        order_id: orderId,
        courier_name: rest.courierName || null,
        tracking_number: rest.trackingNumber || null,
        current_status: rest.currentStatus || null,
        current_location: rest.currentLocation || null,
        last_updated: new Date().toISOString(),
      },
      { onConflict: "order_id" },
    );
  revalidatePath(`/admin/orders/${orderId}`);
}
