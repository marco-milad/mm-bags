"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Loader2, Wallet } from "lucide-react";
import { useState } from "react";
import type { Locale } from "@/lib/i18n-config";

// Kept in sync with the code the /api/newsletter → Resend welcome
// email template emails to new subscribers. Displayed here in the
// success panel so the code lands the instant they subscribe, not
// only when they get around to opening their inbox.
const WELCOME_CODE = "WELCOME10";

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
    <section className="px-6 py-10 md:px-12 md:py-16">
      <div className="relative mx-auto max-w-[1200px] overflow-hidden rounded-[18px] bg-navy-900 px-8 py-10 text-paper md:px-14 md:py-14">
        {/* Faint MM watermark — smaller + fainter than the prior
            18rem/4% pair, which felt like a big dark blob on the
            side. 12rem + 2.5% reads as a subtle brand tell and
            leaves the card feeling less heavy. */}
        <span
          aria-hidden
          className="font-display pointer-events-none absolute -bottom-8 select-none text-[12rem] font-bold leading-none text-white/[0.025] ltr:right-4 rtl:left-4"
        >
          MM
        </span>

        {/* Brass hairline */}
        <span
          aria-hidden
          className="absolute inset-x-8 top-0 h-px bg-brass-500/40 md:inset-x-14"
        />

        <div className="relative grid items-center gap-8 md:grid-cols-[1.1fr_1fr] md:gap-12">
          <div className="flex flex-col gap-3">
            {/* The offer is the whole point of this panel — pull the
                percentage out of the small pill and give it presence
                inside the headline itself. Big brass ١٠٪ inline reads
                the way the visitor's eye actually scans (number first,
                then explanation). */}
            <h2 className="font-display text-3xl leading-tight md:text-4xl">
              {isRTL ? (
                <>
                  اشترك واحصل على{" "}
                  <span className="font-display font-semibold text-brass-300 text-4xl md:text-5xl">
                    ١٠٪
                  </span>{" "}
                  خصم على أول طلب.
                </>
              ) : (
                <>
                  Subscribe and get{" "}
                  <span className="font-display font-semibold text-brass-300 text-4xl md:text-5xl">
                    10%
                  </span>{" "}
                  off your first order.
                </>
              )}
            </h2>

            {/* Value-specific savings — the percentage is abstract,
                the pound number is concrete. The pair lands harder
                than either alone on the Egyptian market. Threshold
                (50 EGP) is a hand-set minimum, tuned so it stays
                true across the full catalog's floor. */}
            <p className="inline-flex w-fit items-center gap-2 rounded-full border border-brass-500/30 bg-brass-500/10 px-3 py-1 text-xs font-medium text-brass-100">
              <Wallet className="h-3.5 w-3.5 text-brass-300" aria-hidden />
              {isRTL
                ? "توفير يبدأ من 50 ج.م على أول طلب"
                : "Savings from EGP 50 on your first order"}
            </p>
            {/* The privacy commitment line moved OUT of this column
                and into the form column just below the submit button
                — closer to the action it modifies, so the visitor
                reads "one email a month · we don't sell your data"
                right before deciding to click. */}
          </div>

          {status.kind === "success" ? (
            // Success state — the code lands in the panel the instant
            // they subscribe (not only when they get around to opening
            // the email), and a "start shopping" CTA immediately
            // channels the intent that just made them subscribe.
            <div className="rounded-lg border border-brass-500/40 bg-navy-800 p-6 text-sm">
              <p className="font-semibold text-brass-300">
                {isRTL ? "تم الاشتراك ✅" : "Subscribed ✅"}
              </p>

              {/* Code plate — big brass-outlined tile with the code
                  in mono/uppercase so it reads as an identifier the
                  user can copy into the cart. */}
              <div className="mt-3 rounded-md border-2 border-dashed border-brass-500 bg-navy-900 px-4 py-3 text-center">
                <p className="font-mono text-[10px] uppercase tracking-widest text-brass-300">
                  {isRTL ? "استخدم الكود" : "Use code"}
                </p>
                <p className="mt-1 font-mono text-2xl font-bold tracking-wider text-brass-200 md:text-3xl">
                  {WELCOME_CODE}
                </p>
              </div>

              <p className="mt-3 text-navy-200">
                {isRTL
                  ? "بعتناه كمان على إيميلك للاحتفاظ."
                  : "We've also emailed it to you for safekeeping."}
              </p>

              <Link
                href={`/${locale}/catalog`}
                className="mt-4 inline-flex items-center gap-2 rounded-md bg-brass-500 px-5 py-2.5 text-sm font-semibold text-navy-900 transition hover:bg-brass-600"
              >
                {isRTL ? "ابدأ التسوّق" : "Start shopping"}
                <Forward className="h-4 w-4" />
              </Link>
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
                    {/* Outcome-first verb — "احصل على كود الخصم" says
                        exactly what the click delivers. The old
                        "اشترك" (subscribe) named the mechanism, not
                        the reward, so it under-sold the trade. */}
                    {isRTL ? "احصل على كود الخصم" : "Get my discount code"}
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
              {/* Specific commitments beat generic "no spam" — an
                  actual cap ("one email a month") plus the two
                  data-rights promises the visitor cares about most.
                  Reads as a real policy rather than boilerplate, and
                  doubles as the implicit-consent notice (which is
                  why the old boilerplate "By subscribing..." line
                  is no longer needed). Placed directly under the
                  submit button so the visitor sees the promise the
                  moment they consider clicking. */}
              <p className="text-[11px] leading-relaxed text-navy-300">
                {isRTL
                  ? "رسالة واحدة في الشهر بس · مش هنبيع بياناتك · تلغي الاشتراك في أي وقت"
                  : "One email a month · We never sell your data · Unsubscribe anytime"}
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
