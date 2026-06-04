import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Locale } from "@/lib/i18n-config";
import type { TopLevelCategory } from "@/lib/queries/categories";
import { categoryImage, categoryLucideIcon } from "@/lib/categories-config";
import { Reveal } from "@/components/shared/Reveal";

/**
 * Collections grid: 6 cards (3-up desktop, 2-up mobile). Image hero on top
 * with a navy-50 → brass-on-hover icon plate overlapping the bottom-start
 * corner, white body below (Cormorant name + Arabic sub + count + CTA).
 * Stagger resets every 3 items so later rows don't lag.
 */
export function CollectionsSection({
  locale,
  categories,
}: {
  locale: Locale;
  categories: TopLevelCategory[];
}) {
  const Forward = locale === "ar" ? ArrowLeft : ArrowRight;

  return (
    <section className="mx-auto max-w-[1200px] px-6 py-20 md:px-12 md:py-24">
      <header className="mb-10 flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-brass-700">
            {locale === "ar" ? "تشكيلاتنا" : "Our collections"}
          </p>
          <h2 className="font-display mt-2 text-3xl text-navy-900 md:text-4xl">
            {locale === "ar" ? "كل اللي تحتاجه" : "All you need"}
          </h2>
        </div>
        <Link
          href={`/${locale}/categories`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-700 underline-offset-4 hover:underline"
        >
          {locale === "ar" ? "عرض كل التشكيلات" : "View all"}
          <Forward className="h-4 w-4" />
        </Link>
      </header>

      <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 md:gap-6">
        {categories.map((cat, i) => {
          const Icon = categoryLucideIcon(cat.slug);
          const stagger = (i % 3) * 80;
          return (
            <Reveal key={cat.slug} as="li" delay={stagger}>
              <Link
                href={`/${locale}/catalog/${cat.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-[14px] border border-line bg-white transition duration-300 ease-out hover:-translate-y-[3px] hover:border-brass-300 hover:shadow-md"
              >
                {/* Image hero */}
                <div className="relative aspect-[4/3] overflow-hidden bg-surface">
                  <Image
                    src={categoryImage(cat.slug)}
                    alt=""
                    fill
                    sizes="(min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                  />
                  {/* Soft brass-wash at the bottom for icon plate legibility */}
                  <div
                    aria-hidden
                    className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-navy-900/20 to-transparent"
                  />
                </div>

                {/* Body */}
                <div className="relative flex flex-1 flex-col gap-3 p-6">
                  {/* Icon plate — overlaps image, anchored to inline-start */}
                  <span
                    aria-hidden
                    className="absolute -top-7 flex h-[54px] w-[54px] items-center justify-center rounded-full border border-line bg-navy-50 text-navy-700 transition duration-300 group-hover:bg-brass-500 group-hover:text-navy-900 ltr:left-6 rtl:right-6"
                  >
                    <Icon className="h-6 w-6" strokeWidth={1.75} />
                  </span>

                  <div className="mt-7 flex items-baseline justify-between gap-3">
                    <h3 className="font-display text-2xl leading-tight text-navy-900">
                      {locale === "ar" ? cat.name_ar : cat.name_en}
                    </h3>
                    <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-ink-500">
                      {cat.productCount}{" "}
                      {locale === "ar"
                        ? "منتج"
                        : cat.productCount === 1
                          ? "product"
                          : "products"}
                    </span>
                  </div>
                  <p className="text-xs text-ink-500">
                    {locale === "ar" ? cat.name_en : cat.name_ar}
                  </p>

                  <p className="mt-auto inline-flex items-center gap-1.5 pt-3 text-sm font-medium text-navy-700 transition group-hover:gap-2.5 group-hover:text-brass-700">
                    {locale === "ar" ? "تصفّح المجموعة" : "Browse collection"}
                    <Forward className="h-3.5 w-3.5" />
                  </p>
                </div>
              </Link>
            </Reveal>
          );
        })}
      </ul>
    </section>
  );
}
