import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Locale } from "@/lib/i18n-config";
import type { TopLevelCategory } from "@/lib/queries/categories";
import { Reveal } from "@/components/shared/Reveal";

/**
 * Collections grid — full-bleed image cards with a dark gradient and the
 * collection name set in Cormorant display over the image. Hover lifts the
 * image and deepens the overlay. Reveal stagger resets every row so later
 * rows don't lag.
 *
 * The cover image comes from TopLevelCategory.coverImage (computed in
 * getTopLevelCategoriesWithCounts → first active product image in scope,
 * falling back to the Unsplash placeholder).
 */
export function CollectionsSection({
  locale,
  categories,
}: {
  locale: Locale;
  categories: TopLevelCategory[];
}) {
  const isRTL = locale === "ar";
  const Forward = isRTL ? ArrowLeft : ArrowRight;

  return (
    <section className="mx-auto max-w-[1360px] px-6 py-12 md:px-12 md:py-24">
      <header className="mb-10 flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-brass-700">
            {isRTL ? "تشكيلاتنا" : "Our collections"}
          </p>
          <h2 className="font-display mt-2 text-3xl text-navy-900 md:text-4xl">
            {isRTL ? "كل اللي تحتاجه" : "All you need"}
          </h2>
        </div>
        <Link
          href={`/${locale}/categories`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-700 underline-offset-4 hover:underline"
        >
          {isRTL ? "عرض كل التشكيلات" : "View all"}
          <Forward className="h-4 w-4" />
        </Link>
      </header>

      <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
        {categories.map((cat, i) => {
          const stagger = (i % 3) * 80;
          return (
            <Reveal key={cat.slug} as="li" delay={stagger}>
              <Link
                href={`/${locale}/catalog/${cat.slug}`}
                className="group relative block aspect-[3/4] overflow-hidden rounded-2xl bg-navy-900 ring-1 ring-line transition duration-500 ease-out md:aspect-[4/5]"
              >
                {/* Cover image */}
                <Image
                  src={cat.coverImage}
                  alt=""
                  fill
                  sizes="(min-width: 768px) 33vw, 50vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                />

                {/* Dark navy gradient — anchored to the bottom edge for text
                    legibility. Deepens on hover to dim the lifestyle photo
                    and bring the type forward. */}
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-navy-900 via-navy-900/60 to-navy-900/15 transition-opacity duration-500 group-hover:from-navy-900 group-hover:via-navy-900/75"
                />

                {/* Product count badge — top corner, RTL-aware */}
                <span
                  className="absolute top-4 inline-flex items-center gap-1 rounded-full border border-white/15 bg-navy-900/55 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-paper backdrop-blur ltr:right-4 rtl:left-4"
                >
                  {cat.productCount}{" "}
                  {isRTL
                    ? "منتج"
                    : cat.productCount === 1
                      ? "product"
                      : "products"}
                </span>

                {/* Caption block — bottom inline-start. Cormorant display for
                    the primary name, mono caption for the other-locale label,
                    brass CTA at the bottom. */}
                <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-5 text-paper md:p-7">
                  <h3 className="font-display text-3xl leading-[1.05] md:text-4xl">
                    {isRTL ? cat.name_ar : cat.name_en}
                  </h3>
                  <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-paper/65">
                    {isRTL ? cat.name_en : cat.name_ar}
                  </p>

                  <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brass-300 transition group-hover:gap-2.5 group-hover:text-brass-200">
                    {isRTL ? "تسوق الآن" : "Shop now"}
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
