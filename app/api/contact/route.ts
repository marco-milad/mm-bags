import { NextResponse } from "next/server";
import { contactFormSchema, CONTACT_SUBJECT_LABELS } from "@/lib/contact-schema";
import { adminEmail, emailFrom, getResend } from "@/lib/email";

export const runtime = "nodejs";

/**
 * POST /api/contact
 *
 * Validates a contact form payload with Zod, blocks honeypot fills, and
 * sends a single notification email to the admin via Resend. The customer
 * sees a success/error message from the client form — no email is sent
 * back to the customer here (kept narrow: one outbound = one moving part).
 *
 * Errors are returned as `{ error: string }` so the client can surface a
 * localized message; we never echo Zod's raw messages to end users.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const parsed = contactFormSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_failed" }, { status: 400 });
  }

  // Honeypot — silently 200 so spammers can't differentiate.
  if (parsed.data.hp) {
    return NextResponse.json({ success: true });
  }

  const { name, email, phone, subject, message, locale } = parsed.data;
  const subjectLabels = CONTACT_SUBJECT_LABELS[subject];
  const subjectDisplay = locale === "ar" ? subjectLabels.ar : subjectLabels.en;

  // Plain HTML is fine for this volume — keeps zero template deps and works
  // in every mail client. The reply-to is set to the customer so Marco can
  // hit reply in his inbox and respond directly.
  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a">
      <h2 style="margin:0 0 16px;font-size:18px">New contact form submission</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:6px 0;color:#666;width:120px">Name</td><td>${escapeHtml(name)}</td></tr>
        <tr><td style="padding:6px 0;color:#666">Email</td><td>${escapeHtml(email)}</td></tr>
        ${phone ? `<tr><td style="padding:6px 0;color:#666">Phone</td><td>${escapeHtml(phone)}</td></tr>` : ""}
        <tr><td style="padding:6px 0;color:#666">Subject</td><td>${escapeHtml(subjectDisplay)} (${subject})</td></tr>
        <tr><td style="padding:6px 0;color:#666">Locale</td><td>${locale.toUpperCase()}</td></tr>
      </table>
      <hr style="margin:20px 0;border:none;border-top:1px solid #eee" />
      <p style="white-space:pre-wrap;line-height:1.6;margin:0">${escapeHtml(message)}</p>
    </div>
  `;

  try {
    const resend = getResend();
    const { error } = await resend.emails.send({
      from: emailFrom(),
      to: adminEmail(),
      replyTo: email,
      subject: `[M.M Bags] ${subjectDisplay} — ${name}`,
      html,
    });
    if (error) {
      console.error("[contact] resend error", error);
      return NextResponse.json({ error: "send_failed" }, { status: 502 });
    }
  } catch (err) {
    console.error("[contact] route error", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

/** Minimal HTML escape for the values we drop into the template above. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
