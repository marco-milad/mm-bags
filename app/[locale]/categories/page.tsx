import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { hasLocale } from "@/lib/i18n-config";
import { categoryIcon } from "@/lib/categories-config";
import { getTopLevelCategoriesWithCounts } from "@/lib/queries/categories";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Categories",
  description:
    "كل تشكيلات M.M Bags — شنط السفر، الظهر، المدارس، الحريم، اليد، واللاب توب.",
};

export default async function CategoriesPage({
  params,
}: PageProps<"/[locale]/categories">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();

  const categories = await getTopLevelCategoriesWithCounts();
  const Forward = locale === "ar" ? ArrowLeft : ArrowRight;

  return (
    <article>
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-[var(--color-primary)] text-white">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-30 mix-blend-overlay"
          style={{
            backgroundImage:
              "radial-gradient(circle at 25% 30%, rgba(212,180,131,0.4), transparent 50%), radial-gradient(circle at 75% 75%, rgba(184,151,90,0.35), transparent 50%)",
          }}
        />
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-4 px-6 py-20 md:px-12 md:py-24">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--color-accent-light)]">
            {locale === "ar" ? "كل تشكيلاتنا" : "All categories"}
          </p>
          <h1 className="max-w-3xl font-display text-4xl leading-[1.1] md:text-6xl">
            {locale === "ar" ? "اكتشف كل تشكيلاتنا" : "Discover all our collections"}
          </h1>
          <p className="max-w-2xl text-sm text-white/80 md:text-base">
            {locale === "ar"
              ? "من شنط السفر للمدارس واللاب توب — كل اللي محتاجه في مكان واحد."
              : "From travel luggage to school and laptop bags — everything you need in one place."}
          </p>
        </div>
      </section>

      {/* Category grid */}
      <section className="mx-auto max-w-6xl px-6 py-16 md:px-12 md:py-20">
        <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <li key={cat.slug}>
              <Link
                href={`/${locale}/catalog/${cat.slug}`}
                className="group relative flex aspect-[4/5] flex-col overflow-hidden rounded-2xl bg-[var(--color-primary)] ring-1 ring-[var(--color-border)] transition hover:shadow-2xl hover:ring-[var(--color-accent)]"
              >
                {/* Background gradient + brass overlay on hover */}
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)] via-[var(--color-primary-light)] to-[var(--color-primary)] transition duration-500 group-hover:scale-110"
                />
                <div
                  aria-hidden
                  className="absolute inset-0 opacity-25 mix-blend-overlay transition-opacity duration-500 group-hover:opacity-50"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 30% 25%, rgba(212,180,131,0.6), transparent 60%)",
                  }}
                />

                {/* Large icon centered */}
                <div className="relative flex flex-1 items-center justify-center">
                  <span
                    aria-hidden
                    className="text-7xl transition-transform duration-500 group-hover:scale-110 md:text-8xl"
                  >
                    {categoryIcon(cat.slug)}
                  </span>
                </div>

                {/* Bottom info block */}
                <div className="relative space-y-1 border-t border-white/10 p-6 text-white backdrop-blur-sm">
                  <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--color-accent-light)]">
                    {cat.productCount}{" "}
                    {locale === "ar"
                      ? "منتج"
                      : cat.productCount === 1
                        ? "product"
                        : "products"}
                  </p>
                  <h2 className="font-display text-2xl leading-tight md:text-3xl">
                    {locale === "ar" ? cat.name_ar : cat.name_en}
                  </h2>
                  <p className="text-xs text-white/60">
                    {locale === "ar" ? cat.name_en : cat.name_ar}
                  </p>
                  <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-accent)] transition group-hover:gap-2.5">
                    {locale === "ar" ? "تسوق الآن" : "Shop now"}
                    <Forward className="h-4 w-4" />
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
