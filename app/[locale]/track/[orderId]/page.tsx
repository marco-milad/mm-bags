import { notFound } from "next/navigation";
import { hasLocale } from "@/lib/i18n-config";
import { TrackingPanel } from "@/components/tracking/TrackingPanel";

export const metadata = {
  title: "Track your order",
};

export default async function TrackOrderPage({
  params,
  searchParams,
}: PageProps<"/[locale]/track/[orderId]">) {
  const { locale, orderId } = await params;
  if (!hasLocale(locale)) notFound();

  const sp = await searchParams;
  const rawPhone = typeof sp?.p === "string" ? sp.p : "";
  const prefillPhone = /^\d{4}$/.test(rawPhone) ? rawPhone : null;

  return (
    <section className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-12">
      <header className="mb-8 flex flex-col gap-2">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-[var(--color-text-secondary)]">
          {locale === "ar" ? "تتبع الطلب" : "Order tracking"}
        </p>
        <h1 className="font-display text-3xl md:text-4xl">
          {locale === "ar" ? "فين طلبك دلوقتي" : "Where is your order"}
        </h1>
      </header>

      <TrackingPanel
        locale={locale}
        initialOrderIdOrNumber={decodeURIComponent(orderId)}
        prefillPhoneLast4={prefillPhone}
      />
    </section>
  );
}
