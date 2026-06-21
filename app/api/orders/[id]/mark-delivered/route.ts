import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/auth";
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
 * Idempotent on second-call: if the order is already delivered we
 * SKIP both the DB write AND the WhatsApp send. The previous version
 * intentionally re-fired the WhatsApp on every call to let admins
 * "retry after fixing a wrong phone" — but with real Twilio credentials
 * that turned every accidental re-POST (cron, double-click, Postman
 * collection) into a billable duplicate. If you genuinely need to
 * re-fire after a phone correction, do it through a separate
 * deliberate endpoint.
 */
export async function POST(
  _req: Request,
  ctx: RouteContext<"/api/orders/[id]/mark-delivered">,
) {
  // ── Admin auth ────────────────────────────────────────────────────
  // Delegate to the shared helper so we get the staff-table lookup
  // (and so user_metadata.role is NOT trusted — see lib/admin/auth.ts).
  try {
    await requireAdmin(["admin", "manager"]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "forbidden";
    return NextResponse.json(
      { error: msg.toLowerCase() },
      { status: msg === "UNAUTHORIZED" ? 401 : 403 },
    );
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

  // ── Atomic status flip + idempotency gate ────────────────────────
  // Use a conditional update so we only proceed with the WhatsApp
  // send when THIS call actually performed the transition. Concurrent
  // calls / re-clicks see `updated` as null and skip the send.
  const { data: updated, error: updateErr } = await admin
    .from("orders")
    .update({ status: "delivered" })
    .eq("id", orderId)
    .neq("status", "delivered")
    .select("id")
    .maybeSingle();
  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }
  // Already delivered (or another concurrent caller won) — no send.
  if (!updated) {
    return NextResponse.json({
      success: true,
      whatsapp: { attempted: false, skipped: "already_delivered" },
    });
  }

  // ── Review prompt (best-effort) ──────────────────────────────────
  const address = (order.shipping_address as ShippingAddressShape) ?? {};
  const customerName = address.name?.trim();
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

  let whatsapp: { attempted: boolean; ok?: boolean } = {
    attempted: false,
  };
  if (customerPhone && customerName && firstProduct) {
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
      // Log a generic failure server-side without echoing Twilio's
      // error verbatim — those payloads can leak request context
      // into Vercel logs.
      console.warn("[mark-delivered] whatsapp failed", res.error);
    }
  }

  return NextResponse.json({ success: true, whatsapp });
}
