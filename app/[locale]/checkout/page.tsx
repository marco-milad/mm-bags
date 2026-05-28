import { notFound } from "next/navigation";
import { hasLocale } from "@/lib/i18n-config";
import { CheckoutFlow } from "@/components/checkout/CheckoutFlow";

export const metadata = {
  title: "Checkout",
};

export default async function CheckoutPage({
  params,
}: PageProps<"/[locale]/checkout">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
      <header className="mb-6">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-[var(--color-text-secondary)]">
          {locale === "ar" ? "إكمال الشراء" : "Checkout"}
        </p>
        <h1 className="font-display text-3xl md:text-4xl">
          {locale === "ar" ? "اكمل طلبك" : "Complete your order"}
        </h1>
      </header>
      <CheckoutFlow locale={locale} />
    </section>
  );
}
