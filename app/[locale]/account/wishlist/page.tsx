import { notFound } from "next/navigation";
import { hasLocale } from "@/lib/i18n-config";
import { WishlistGrid } from "@/components/wishlist/WishlistGrid";

export const metadata = {
  title: "Wishlist",
};

export default async function WishlistPage({
  params,
}: PageProps<"/[locale]/account/wishlist">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
      <header className="mb-6 flex flex-col gap-2">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-[var(--color-text-secondary)]">
          {locale === "ar" ? "حسابي" : "Account"}
        </p>
        <h1 className="font-display text-3xl md:text-4xl">
          {locale === "ar" ? "المفضلة" : "Wishlist"}
        </h1>
      </header>
      <WishlistGrid locale={locale} />
    </section>
  );
}
