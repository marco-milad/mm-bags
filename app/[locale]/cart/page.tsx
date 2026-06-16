import { notFound } from "next/navigation";
import { hasLocale } from "@/lib/i18n-config";
import { CartPageContent } from "@/components/cart/CartPageContent";

export const metadata = {
  title: "Cart — M.M Bags",
};

/**
 * /{locale}/cart — full-page cart view.
 *
 * The cart drawer in the navbar handles the quick-view path; this
 * dedicated page exists so that direct links (e.g. emails, the
 * "View cart" button on a PDP after add-to-cart, browser back from
 * checkout) work without a 404.
 */
export default async function CartPage({
  params,
}: PageProps<"/[locale]/cart">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const isRTL = locale === "ar";

  return (
    <section className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-12">
      <header className="mb-8 flex flex-col gap-2">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-[var(--color-text-secondary)]">
          {isRTL ? "السلة" : "Cart"}
        </p>
        <h1 className="font-display text-3xl md:text-4xl">
          {isRTL ? "سلة التسوق" : "Your cart"}
        </h1>
      </header>

      <CartPageContent locale={locale} />
    </section>
  );
}
