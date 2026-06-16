import Link from "next/link";
import { notFound } from "next/navigation";
import { Package } from "lucide-react";
import { hasLocale } from "@/lib/i18n-config";
import { TrackOrderForm } from "@/components/account/TrackOrderForm";

export const metadata = {
  title: "Track your order — M.M Bags",
};

/**
 * /{locale}/track — landing page for the track-order flow.
 *
 * The dynamic /{locale}/track/{orderId} renders the tracking
 * details; this index page exists so a customer who lands on
 * /track without an ID (from a WhatsApp message link, footer link,
 * memory) sees the search form instead of a 404.
 */
export default async function TrackIndexPage({
  params,
}: PageProps<"/[locale]/track">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const isRTL = locale === "ar";

  return (
    <section className="mx-auto max-w-2xl px-4 py-12 md:px-6 md:py-20">
      <header className="mb-8 text-center">
        <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-text)] text-[var(--color-bg)]">
          <Package className="h-6 w-6" />
        </span>
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-[var(--color-text-secondary)]">
          {isRTL ? "تتبع الطلب" : "Track order"}
        </p>
        <h1 className="mt-2 font-display text-3xl md:text-4xl">
          {isRTL ? "تتبّع طلبك" : "Track your order"}
        </h1>
        <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
          {isRTL
            ? "اكتب رقم الطلب اللي وصلك على الواتساب أو الإيميل."
            : "Enter the order ID we sent you on WhatsApp or email."}
        </p>
      </header>

      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <TrackOrderForm locale={locale} />
        <p className="mt-4 text-center text-xs text-[var(--color-text-secondary)]">
          {isRTL ? "عندك حساب؟ " : "Have an account? "}
          <Link
            href={`/${locale}/account`}
            className="text-[var(--color-primary)] underline-offset-4 hover:underline"
          >
            {isRTL ? "شوف طلباتك في حسابك" : "see your orders"}
          </Link>
        </p>
      </div>
    </section>
  );
}
