import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendWhatsApp } from "@/lib/twilio";
import { buildPostDeliveryMessage } from "@/lib/reviews/post-delivery";
import type { Locale } from "@/lib/i18n-config";

export const runtime = "nodejs";

type ShippingAddressShape = {
  name?: string;
  phone?: string;
  locale?: Locale;
};

/**
 * POST /api/orders/[id]/mark-delivered
 *
 * Admin-only. Flips an order's status to `delivered` and (best-effort)
 * sends the customer a WhatsApp message asking for a review on the
 * first item of the order.
 *
 * The status update is the durable side-effect; the WhatsApp send is
 * best-effort because Twilio outages shouldn't roll back an inventory-
 * accurate order status. If the order is already `delivered` we no-op
 * the DB write but still attempt the WhatsApp send so admins can
 * re-trigger after fixing a wrong phone.
 */
export async function POST(
  _req: Request,
  ctx: RouteContext<"/api/orders/[id]/mark-delivered">,
) {
  // ── Admin auth — same gate as app/admin/layout.tsx ────────────────
  const userClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const adminEmail = process.env.ADMIN_EMAIL;
  const role = (user.user_metadata as { role?: string } | null)?.role;
  const isAdmin =
    role === "admin" || (adminEmail && user.email === adminEmail);
  if (!isAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id: orderId } = await ctx.params;

  const admin = getSupabaseAdminClient();
  const { data: order, error: fetchErr } = await admin
    .from("orders")
    .select(
      "id, status, shipping_address, order_items(product:products!inner(slug, name_ar, name_en))",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }
  if (!order) {
    return NextResponse.json({ error: "order_not_found" }, { status: 404 });
  }

  // ── Status flip ──────────────────────────────────────────────────
  if (order.status !== "delivered") {
    const { error: updateErr } = await admin
      .from("orders")
      .update({ status: "delivered" })
      .eq("id", orderId);
    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }
  }

  // ── Review prompt (best-effort) ──────────────────────────────────
  const address = (order.shipping_address as ShippingAddressShape) ?? {};
  const customerName = address.name?.trim() || "صاحب الطلب";
  const customerPhone = address.phone?.trim();
  const locale: Locale = address.locale === "en" ? "en" : "ar";

  // Use the first order item's product as the review target. Multi-item
  // orders still get one message; sending N messages would feel spammy
  // and Twilio rate-limits anyway. The phrasing is product-singular.
  // Items come back as either an object or an array per PostgREST's
  // join-shape quirks, so we normalise.
  const items = (order.order_items ?? []) as Array<{
    product:
      | { slug: string; name_ar: string; name_en: string }
      | { slug: string; name_ar: string; name_en: string }[]
      | null;
  }>;
  const firstProduct = items
    .map((it) => (Array.isArray(it.product) ? it.product[0] : it.product))
    .find((p) => p && p.slug);

  let whatsapp: { attempted: boolean; ok?: boolean; error?: string } = {
    attempted: false,
  };
  if (customerPhone && firstProduct) {
    whatsapp = { attempted: true };
    const body = buildPostDeliveryMessage({
      locale,
      name: customerName,
      productSlug: firstProduct.slug,
    });
    const res = await sendWhatsApp({ to: customerPhone, body });
    if (res.ok) {
      whatsapp.ok = true;
    } else {
      whatsapp.ok = false;
      whatsapp.error = res.error;
      // We log but don't fail the request — the order status change
      // already succeeded. The admin can retry the send from the UI.
      console.warn("[mark-delivered] whatsapp failed", res.error);
    }
  }

  return NextResponse.json({ success: true, whatsapp });
}
