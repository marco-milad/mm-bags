import { ArrowLeft, ArrowRight, Mail } from "lucide-react";
import type { Locale } from "@/lib/i18n-config";

/**
 * Newsletter — navy panel, 10% off first order. New subscribers only.
 * No backend yet; form posts to nowhere. When the email pipeline lands,
 * wire onSubmit to a server action + show success toast.
 */
export function NewsletterPanel({ locale }: { locale: Locale }) {
  const Forward = locale === "ar" ? ArrowLeft : ArrowRight;

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
        <span aria-hidden className="absolute inset-x-8 top-0 h-px bg-brass-500/40 md:inset-x-16" />

        <div className="relative grid items-center gap-10 md:grid-cols-[1.1fr_1fr] md:gap-16">
          <div className="flex flex-col gap-3">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-sm bg-brass-500 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-navy-900">
              <Mail className="h-3 w-3" />
              {locale === "ar" ? "خصم ١٠٪" : "10% off"}
            </span>
            <h2 className="font-display text-3xl leading-tight md:text-4xl">
              {locale === "ar"
                ? "اشترك واحصل على خصم ١٠٪ على أول طلب."
                : "Subscribe and get 10% off your first order."}
            </h2>
            <p className="text-sm text-navy-200">
              {locale === "ar"
                ? "عرض خاص للمشتركين الجدد فقط. هنبعتلك الجديد، مفيش سبام."
                : "Exclusive offer for new subscribers only. We send new arrivals, never spam."}
            </p>
          </div>

          <form className="flex flex-col gap-3">
            <label className="sr-only" htmlFor="mm-newsletter-email">
              {locale === "ar" ? "البريد الإلكتروني" : "Email"}
            </label>
            <input
              id="mm-newsletter-email"
              type="email"
              required
              autoComplete="email"
              placeholder={locale === "ar" ? "بريدك الإلكتروني" : "you@example.com"}
              dir="ltr"
              className="rounded-md border border-navy-600 bg-navy-800 px-4 py-3 text-sm text-paper placeholder:text-navy-300 focus:border-brass-500 focus:outline-none"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-brass-500 px-6 py-3 text-sm font-semibold text-navy-900 transition hover:bg-brass-600"
            >
              {locale === "ar" ? "اشترك" : "Subscribe"}
              <Forward className="h-4 w-4" />
            </button>
            <p className="text-[11px] text-navy-300">
              {locale === "ar"
                ? "بتسجيلك، إنت موافق على سياسة الخصوصية."
                : "By subscribing, you agree to our privacy policy."}
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
