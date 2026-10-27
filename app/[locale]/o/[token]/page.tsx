import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "@/lib/i18n-config";
import { getOrderByViewToken } from "@/lib/orders/order-view";
import { TrackingDetails } from "@/components/tracking/TrackingDetails";

// The private order link: whoever holds it sees the order — no sign-in, no
// phone digits. Always fresh (status changes), never indexed or cached.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your order",
  robots: { index: false, follow: false },
};

export default async function OrderLinkPage({ params }: PageProps<"/[locale]/o/[token]">) {
  const { locale, token } = await params;
  if (!hasLocale(locale)) notFound();

  const tracking = await getOrderByViewToken(token, locale);
  if (!tracking) notFound();

  return (
    <section className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-12">
      <header className="mb-8 flex flex-col gap-2">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-[var(--color-text-secondary)]">
          {locale === "ar" ? "طلبك" : "Your order"}
        </p>
        <h1 className="font-display text-3xl md:text-4xl">
          {locale === "ar" ? `طلب رقم ${tracking.orderNumber}` : `Order ${tracking.orderNumber}`}
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          {locale === "ar"
            ? "احفظ اللينك ده — بيفتح طلبك من أي جهاز من غير تسجيل دخول. ماتبعتهوش لحد غيرك."
            : "Keep this link — it opens your order on any device, no sign-in needed. Don't share it with others."}
        </p>
      </header>

      <TrackingDetails tracking={tracking} locale={locale} />
    </section>
  );
}
