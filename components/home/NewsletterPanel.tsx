"use client";

import { ArrowLeft, ArrowRight, Loader2, Mail } from "lucide-react";
import { useState } from "react";
import type { Locale } from "@/lib/i18n-config";

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success" }
  | { kind: "error"; message: string };

/**
 * Newsletter — navy panel, 10% off first order. Subscribes via
 * /api/newsletter which persists to Supabase and sends a welcome email
 * with the WELCOME10 code via Resend.
 *
 * On success the form swaps to a confirmation message (we don't blank the
 * email immediately — replacing the whole form is the strongest signal
 * that the click did something).
 */
export function NewsletterPanel({ locale }: { locale: Locale }) {
  const Forward = locale === "ar" ? ArrowLeft : ArrowRight;
  const isRTL = locale === "ar";

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const submitting = status.kind === "submitting";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setStatus({ kind: "submitting" });
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), locale }),
      });
      if (!res.ok) {
        setStatus({
          kind: "error",
          message: isRTL
            ? "في مشكلة، جرب تاني."
            : "Something went wrong — please try again.",
        });
        return;
      }
      setStatus({ kind: "success" });
    } catch {
      setStatus({
        kind: "error",
        message: isRTL
          ? "مشكلة في الاتصال، جرب تاني."
          : "Network error — please try again.",
      });
    }
  }

  return (
    <section className="px-6 py-12 md:px-12 md:py-24">
      <div className="relative mx-auto max-w-[1200px] overflow-hidden rounded-[18px] bg-navy-900 px-8 py-14 text-paper md:px-16 md:py-20">
        {/* Faint MM watermark on the right */}
        <span
          aria-hidden
          className="font-display pointer-events-none absolute -bottom-12 select-none text-[18rem] font-bold leading-none text-white/[0.04] ltr:right-4 rtl:left-4"
        >
          MM
        </span>

        {/* Brass hairline */}
        <span
          aria-hidden
          className="absolute inset-x-8 top-0 h-px bg-brass-500/40 md:inset-x-16"
        />

        <div className="relative grid items-center gap-10 md:grid-cols-[1.1fr_1fr] md:gap-16">
          <div className="flex flex-col gap-3">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-sm bg-brass-500 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-navy-900">
              <Mail className="h-3 w-3" />
              {isRTL ? "خصم ١٠٪" : "10% off"}
            </span>
            <h2 className="font-display text-3xl leading-tight md:text-4xl">
              {isRTL
                ? "اشترك واحصل على خصم ١٠٪ على أول طلب."
                : "Subscribe and get 10% off your first order."}
            </h2>
            <p className="text-sm text-navy-200">
              {isRTL
                ? "عرض خاص للمشتركين الجدد فقط. هنبعتلك الجديد، مفيش سبام."
                : "Exclusive offer for new subscribers only. We send new arrivals, never spam."}
            </p>
          </div>

          {status.kind === "success" ? (
            // Success state — replaces the form so the click feels decisive
            // without needing a toast (and the panel header still gives
            // context).
            <div className="rounded-md border border-brass-500/40 bg-navy-800 p-5 text-sm">
              <p className="font-semibold text-brass-300">
                {isRTL
                  ? "تم الاشتراك ✅ شوف بريدك الإلكتروني."
                  : "Subscribed ✅ Check your inbox."}
              </p>
              <p className="mt-1.5 text-navy-200">
                {isRTL
                  ? "بعتنالك كوبون خصم ١٠٪ على أول طلب."
                  : "We've emailed you a 10% off code for your first order."}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <label className="sr-only" htmlFor="mm-newsletter-email">
                {isRTL ? "البريد الإلكتروني" : "Email"}
              </label>
              <input
                id="mm-newsletter-email"
                type="email"
                required
                autoComplete="email"
                placeholder={isRTL ? "بريدك الإلكتروني" : "you@example.com"}
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
                className="rounded-md border border-navy-600 bg-navy-800 px-4 py-3 text-sm text-paper placeholder:text-navy-300 focus:border-brass-500 focus:outline-none disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-brass-500 px-6 py-3 text-sm font-semibold text-navy-900 transition hover:bg-brass-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    {isRTL ? "اشترك" : "Subscribe"}
                    <Forward className="h-4 w-4" />
                  </>
                )}
              </button>
              {status.kind === "error" && (
                <p
                  role="alert"
                  className="rounded-md border border-red-400/40 bg-red-500/10 px-3 py-2 text-xs text-red-200"
                >
                  {status.message}
                </p>
              )}
              <p className="text-[11px] text-navy-300">
                {isRTL
                  ? "بتسجيلك، إنت موافق على سياسة الخصوصية."
                  : "By subscribing, you agree to our privacy policy."}
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
