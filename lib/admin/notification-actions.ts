"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/auth";
import {
  adminEmail,
  emailFrom,
  getResend,
} from "@/lib/email";
import { sendWhatsApp } from "@/lib/twilio";
import type { NotificationChannel } from "@/lib/supabase/types";

/**
 * Back-in-stock notification dispatch.
 *
 * Two entry points:
 *   - sendVariantNotificationsForm(formData): batches all PENDING
 *     subscribers for a single variant.
 *   - sendAllPendingNotifications(): same, for every variant the DB
 *     currently has pending rows on.
 *
 * Strategy:
 *   1. Fetch the pending rows + product + variant context in one
 *      query (no per-row lookups).
 *   2. Dispatch per-subscriber, awaiting in serial. Twilio + Resend
 *      both rate-limit cheaply at our volume; bursting would mostly
 *      cost retries.
 *   3. On a successful send, flip notified=true. On failure, log and
 *      LEAVE notified=false so a retry can pick it up later.
 *
 * The two channels share the same content (in two languages) but
 * different message envelopes — we keep one templater fn per
 * channel right here.
 */

const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL ?? "https://mmbags.com"
).replace(/\/+$/, "");

export type DispatchResult = {
  variantId: string;
  attempted: number;
  succeeded: number;
  failed: number;
};

type Subscription = {
  id: string;
  guest_email: string | null;
  guest_phone: string | null;
  channel: NotificationChannel;
  product_id: string | null;
  variant_id: string | null;
  product_name_ar: string;
  product_name_en: string;
  product_slug: string;
};

/**
 * Send back-in-stock notifications for ALL pending subscribers of a
 * single variant. Form action — the row's Send button posts here.
 */
export async function sendVariantNotificationsForm(
  formData: FormData,
): Promise<void> {
  try {
    await requireAdmin();
  } catch {
    return;
  }
  const variantId = formData.get("variantId");
  if (typeof variantId !== "string") return;
  await dispatchForVariant(variantId);
  revalidatePath("/admin/notifications");
  revalidatePath("/admin");
}

/** Bulk dispatcher — every variant with pending rows. */
export async function sendAllPendingNotifications(): Promise<void> {
  try {
    await requireAdmin();
  } catch {
    return;
  }
  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from("notification_subscriptions")
    .select("variant_id")
    .eq("notified", false);
  const variantIds = Array.from(
    new Set(
      (data ?? [])
        .map((r) => r.variant_id)
        .filter((v): v is string => Boolean(v)),
    ),
  );
  for (const vid of variantIds) {
    await dispatchForVariant(vid);
  }
  revalidatePath("/admin/notifications");
  revalidatePath("/admin");
}

// ─── Core dispatcher ─────────────────────────────────────────────────
async function dispatchForVariant(variantId: string): Promise<DispatchResult> {
  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from("notification_subscriptions")
    .select(
      "id, guest_email, guest_phone, channel, product_id, variant_id, " +
      "product:products!inner(name_ar, name_en, slug)",
    )
    .eq("variant_id", variantId)
    .eq("notified", false);

  const raw = (data ?? []) as unknown as Array<{
    id: string;
    guest_email: string | null;
    guest_phone: string | null;
    channel: NotificationChannel;
    product_id: string | null;
    variant_id: string | null;
    product:
      | { name_ar: string; name_en: string; slug: string }
      | Array<{ name_ar: string; name_en: string; slug: string }>
      | null;
  }>;

  const subs: Subscription[] = raw.flatMap((r) => {
    const product = Array.isArray(r.product) ? r.product[0] : r.product;
    if (!product) return [];
    return [
      {
        id: r.id,
        guest_email: r.guest_email,
        guest_phone: r.guest_phone,
        channel: r.channel,
        product_id: r.product_id,
        variant_id: r.variant_id,
        product_name_ar: product.name_ar,
        product_name_en: product.name_en,
        product_slug: product.slug,
      },
    ];
  });

  let succeeded = 0;
  let failed = 0;
  for (const sub of subs) {
    const ok = await dispatchOne(sub);
    if (ok) {
      await admin
        .from("notification_subscriptions")
        .update({ notified: true })
        .eq("id", sub.id);
      succeeded += 1;
    } else {
      failed += 1;
    }
  }
  return {
    variantId,
    attempted: subs.length,
    succeeded,
    failed,
  };
}

async function dispatchOne(sub: Subscription): Promise<boolean> {
  // Best-effort: a missing contact for the row's channel can't be
  // sent. Mark as "failed" so the row stays pending and admin can
  // see they need to fix the contact.
  try {
    if (sub.channel === "email") {
      if (!sub.guest_email) return false;
      const resend = getResend();
      const { html, subject } = buildEmail({
        productNameAr: sub.product_name_ar,
        productSlug: sub.product_slug,
      });
      const { error } = await resend.emails.send({
        from: emailFrom(),
        to: sub.guest_email,
        replyTo: adminEmail(),
        subject,
        html,
      });
      return !error;
    }
    if (sub.channel === "whatsapp") {
      if (!sub.guest_phone) return false;
      const body = buildWhatsApp({
        productNameAr: sub.product_name_ar,
        productSlug: sub.product_slug,
      });
      const res = await sendWhatsApp({ to: sub.guest_phone, body });
      return res.ok;
    }
    return false;
  } catch (err) {
    console.warn("[notifications/dispatch]", err);
    return false;
  }
}

// ─── Templates ──────────────────────────────────────────────────────
function buildEmail(opts: {
  productNameAr: string;
  productSlug: string;
}): { subject: string; html: string } {
  const link = `${APP_URL}/ar/products/${opts.productSlug}`;
  const subject = `${opts.productNameAr} رجع المخزن! 🎒`;
  const html = `
    <div dir="rtl" style="font-family:system-ui,-apple-system,'Tajawal','Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#1a1a1a;text-align:right">
      <h1 style="margin:0 0 12px;font-size:22px;color:#0d2540">${escapeHtml(opts.productNameAr)} رجع المخزن!</h1>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#444">
        المنتج اللي طلبت إشعار عنه متاح دلوقتي. اضغط هنا واطلبه قبل ما يخلص تاني.
      </p>
      <p style="text-align:center;margin:24px 0">
        <a href="${link}" style="display:inline-block;background:#0d2540;color:#fff;padding:12px 28px;border-radius:9999px;text-decoration:none;font-weight:600">
          اطلبه دلوقتي
        </a>
      </p>
      <p style="margin:0;font-size:13px;color:#888">
        M.M Bags — سافر بذكاء. سافر بأناقة.
      </p>
    </div>
  `;
  return { subject, html };
}

function buildWhatsApp(opts: {
  productNameAr: string;
  productSlug: string;
}): string {
  const link = `${APP_URL}/ar/products/${opts.productSlug}`;
  return (
    `أهلاً! 🎒\n` +
    `المنتج اللي طلبت إشعار عنه رجع المخزن:\n` +
    `${opts.productNameAr}\n\n` +
    `اطلبه قبل ما يخلص تاني:\n` +
    `${link}\n\n` +
    `M.M Bags`
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
