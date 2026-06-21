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

  // Atomic transition: only one writer can flip `pending → delivered`
  // because the WHERE clause requires the old status to be different.
  // This collapses the previous read-then-write race that allowed
  // double-clicks to fire two WhatsApp messages.
  let transitionedToDelivered = false;
  if (status === "delivered") {
    const { data: updated } = await admin
      .from("orders")
      .update({ status })
      .eq("id", id)
      .neq("status", "delivered")
      .select("id")
      .maybeSingle();
    transitionedToDelivered = !!updated;
  } else {
    await admin.from("orders").update({ status }).eq("id", id);
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
