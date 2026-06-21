"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/auth";
import { adminEmail, emailFrom, getResend } from "@/lib/email";

/**
 * Admin actions for /admin/newsletter.
 *
 * - toggleSubscriberActive: row-level enable/disable.
 * - sendBroadcast: AR + EN templates, dispatches to ALL active
 *   subscribers in their preferred locale via Resend, then returns
 *   a `{ ok, sent, failed }` summary surfaced inline.
 *
 * Note: this loops Resend calls in serial. At ~hundreds of
 * subscribers it's fine; at >5k we'd batch with Resend's
 * `emails.batch` API or move to a queue. Out of scope for the MVP.
 */

const broadcastSchema = z
  .object({
    subjectAr: z.string().trim().min(1).max(200),
    subjectEn: z.string().trim().min(1).max(200),
    bodyAr: z.string().trim().min(1).max(40_000),
    bodyEn: z.string().trim().min(1).max(40_000),
  });

export type BroadcastResult =
  | { ok: true; sent: number; failed: number }
  | { ok: false; error: string };

// ─── Single-row toggle ──────────────────────────────────────────────
export async function toggleSubscriberActive(
  formData: FormData,
): Promise<void> {
  // Void-returning action — let auth errors bubble so the Next.js
  // error overlay surfaces them in the admin UI rather than silently
  // no-opping (the previous swallow turned every auth failure into
  // a fail-open HTTP 200).
  await requireAdmin(["admin", "manager"]);
  const id = formData.get("id");
  if (typeof id !== "string") return;
  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from("newsletter_subscribers")
    .select("is_active")
    .eq("id", id)
    .maybeSingle();
  if (!data) return;
  await admin
    .from("newsletter_subscribers")
    .update({ is_active: !data.is_active })
    .eq("id", id);
  revalidatePath("/admin/newsletter");
}

// ─── Broadcast send ─────────────────────────────────────────────────
export async function sendBroadcast(
  _prev: BroadcastResult,
  formData: FormData,
): Promise<BroadcastResult> {
  // Result-returning action — surface auth failure to the UI as a
  // typed error, but rethrow any OTHER unexpected error so transient
  // Supabase issues etc. don't get mis-reported as "not authorised".
  try {
    await requireAdmin(["admin", "manager"]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg !== "UNAUTHORIZED" && msg !== "FORBIDDEN") throw err;
    return { ok: false, error: "Not authorised" };
  }
  const parsed = broadcastSchema.safeParse({
    subjectAr: formData.get("subjectAr") ?? "",
    subjectEn: formData.get("subjectEn") ?? "",
    bodyAr: formData.get("bodyAr") ?? "",
    bodyEn: formData.get("bodyEn") ?? "",
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  const { subjectAr, subjectEn, bodyAr, bodyEn } = parsed.data;

  const admin = getSupabaseAdminClient();
  const { data: subs } = await admin
    .from("newsletter_subscribers")
    .select("email, locale")
    .eq("is_active", true);
  const list = (subs ?? []) as Array<{ email: string; locale: "ar" | "en" }>;

  let resend;
  try {
    resend = getResend();
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Resend not configured",
    };
  }
  const from = emailFrom();
  const replyTo = adminEmail();

  let sent = 0;
  let failed = 0;
  for (const sub of list) {
    const isAr = sub.locale === "ar";
    const subject = isAr ? subjectAr : subjectEn;
    const html = isAr
      ? wrapHtmlAr(bodyAr)
      : wrapHtmlEn(bodyEn);
    try {
      const { error } = await resend.emails.send({
        from,
        to: sub.email,
        replyTo,
        subject,
        html,
      });
      if (error) {
        failed += 1;
      } else {
        sent += 1;
      }
    } catch (err) {
      console.warn("[newsletter/broadcast]", err);
      failed += 1;
    }
  }
  revalidatePath("/admin/newsletter");
  return { ok: true, sent, failed };
}

// ─── HTML wrappers ──────────────────────────────────────────────────
/**
 * Resend takes raw HTML, so we wrap the admin's body (which is
 * accepted as plain text) inside a light template with the brand
 * envelope. We honour line breaks via `white-space: pre-wrap` so the
 * admin doesn't have to type HTML.
 */
function wrapHtmlAr(body: string): string {
  return `
    <div dir="rtl" style="font-family:system-ui,-apple-system,'Tajawal','Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#1a1a1a;text-align:right">
      <p style="margin:0;font-size:15px;line-height:1.7;color:#1a1a1a;white-space:pre-wrap">${escapeHtml(body)}</p>
      <hr style="margin:24px 0;border:none;border-top:1px solid #eee" />
      <p style="margin:0;font-size:12px;color:#999">M.M Bags — سافر بذكاء. سافر بأناقة.</p>
    </div>
  `;
}

function wrapHtmlEn(body: string): string {
  return `
    <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#1a1a1a">
      <p style="margin:0;font-size:15px;line-height:1.7;color:#1a1a1a;white-space:pre-wrap">${escapeHtml(body)}</p>
      <hr style="margin:24px 0;border:none;border-top:1px solid #eee" />
      <p style="margin:0;font-size:12px;color:#999">M.M Bags — Travel smart. Travel in style.</p>
    </div>
  `;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
