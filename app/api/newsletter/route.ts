import { NextResponse } from "next/server";
import {
  newsletterSchema,
  NEWSLETTER_WELCOME_CODE,
} from "@/lib/newsletter-schema";
import { adminEmail, emailFrom, getResend } from "@/lib/email";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * POST /api/newsletter
 *
 * Subscribes an email address, sends a welcome email with a discount code,
 * and notifies the admin. The Supabase write happens BEFORE the email sends
 * so a Resend outage doesn't drop the subscription. If the welcome email
 * fails we still return success — the subscriber is in the list and Marco
 * can follow up manually from the admin notification (which retries on a
 * separate call below and is best-effort).
 *
 * Re-subscribes (same email twice) are handled with an upsert that flips
 * `is_active` back to true and bumps `subscribed_at`, so a user who
 * unsubscribed once and comes back is fully re-activated by the same flow.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const parsed = newsletterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_failed" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const locale = parsed.data.locale;

  // 1) Persist the subscription. Upsert on `email` so a returning subscriber
  // flips back to active without surfacing a unique-violation error.
  try {
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase
      .from("newsletter_subscribers")
      .upsert(
        {
          email,
          locale,
          is_active: true,
          subscribed_at: new Date().toISOString(),
        },
        { onConflict: "email" },
      );
    if (error) {
      console.error("[newsletter] supabase error", error);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }
  } catch (err) {
    console.error("[newsletter] db setup", err);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  // 2) Welcome email + admin notification. Both are best-effort: we log any
  // failure but still return success so the subscriber is treated as
  // signed up (which they are — they're in the table).
  try {
    const resend = getResend();
    const from = emailFrom();

    const { welcomeSubject, welcomeHtml } = buildWelcomeEmail(locale);

    // Fire both in parallel — neither blocks the other and we don't await
    // them past Promise.allSettled so a single failure isn't fatal.
    await Promise.allSettled([
      resend.emails.send({
        from,
        to: email,
        subject: welcomeSubject,
        html: welcomeHtml,
      }),
      resend.emails.send({
        from,
        to: adminEmail(),
        subject: `[M.M Bags] New newsletter subscriber`,
        html: `<p>مشترك جديد: <strong>${escapeHtml(email)}</strong> (${locale})</p>`,
      }),
    ]);
  } catch (err) {
    // Resend not configured, network failure, etc. Subscription is already
    // safe in the DB so we still return success.
    console.warn("[newsletter] email send skipped", err);
  }

  return NextResponse.json({ success: true });
}

/**
 * Builds the welcome email in the subscriber's locale. Kept inline because
 * the template is short and we don't have an email-template system yet —
 * if we add more transactional emails, extract to lib/emails/.
 */
function buildWelcomeEmail(locale: "ar" | "en"): {
  welcomeSubject: string;
  welcomeHtml: string;
} {
  if (locale === "ar") {
    return {
      welcomeSubject: "أهلاً بيك في M.M Bags 🧳",
      welcomeHtml: `
        <div dir="rtl" style="font-family:system-ui,-apple-system,'Tajawal','Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#1a1a1a;text-align:right">
          <h1 style="margin:0 0 12px;font-size:22px;color:#0d2540">أهلاً بيك في M.M Bags 🧳</h1>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#444">
            شكراً إنك اشتركت معنا. هنبعتلك أحدث التشكيلات والعروض الحصرية، من غير سبام.
          </p>
          <div style="margin:24px 0;padding:20px;background:#fff8e6;border:1px dashed #b8860b;border-radius:12px;text-align:center">
            <p style="margin:0 0 6px;font-size:13px;color:#6b5b00">كوبون خصم ١٠٪ على أول طلب</p>
            <p style="margin:0;font-family:monospace;font-size:24px;font-weight:700;letter-spacing:2px;color:#0d2540">${NEWSLETTER_WELCOME_CODE}</p>
          </div>
          <p style="margin:0;font-size:14px;color:#666">سافر بذكاء. سافر بأناقة.<br/>— ماركو ميلاد</p>
        </div>
      `,
    };
  }
  return {
    welcomeSubject: "Welcome to M.M Bags 🧳",
    welcomeHtml: `
      <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#1a1a1a">
        <h1 style="margin:0 0 12px;font-size:22px;color:#0d2540">Welcome to M.M Bags 🧳</h1>
        <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#444">
          Thanks for subscribing — we'll keep you in the loop on new arrivals and subscriber-only offers. No spam, ever.
        </p>
        <div style="margin:24px 0;padding:20px;background:#fff8e6;border:1px dashed #b8860b;border-radius:12px;text-align:center">
          <p style="margin:0 0 6px;font-size:13px;color:#6b5b00">10% off your first order</p>
          <p style="margin:0;font-family:monospace;font-size:24px;font-weight:700;letter-spacing:2px;color:#0d2540">${NEWSLETTER_WELCOME_CODE}</p>
        </div>
        <p style="margin:0;font-size:14px;color:#666">Travel smart. Travel in style.<br/>— Marco Milad</p>
      </div>
    `,
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
