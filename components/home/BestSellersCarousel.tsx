"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
import type { Locale } from "@/lib/i18n-config";
import type { ProductWithVariants } from "@/lib/catalog-shared";
import { ProductCard } from "@/components/product/ProductCard";

/**
 * Horizontal magazine carousel for the best-seller rail.
 * scroll-snap-type: x mandatory + scroll-behavior: smooth (per MOTION spec).
 * Prev/next buttons scroll by ~290px (one card-width + gap). RTL-aware:
 * the "Forward" arrow flips, but the scroll math stays positive because
 * the browser handles RTL scroll coordinates correctly.
 */
export function BestSellersCarousel({
  locale,
  products,
}: {
  locale: Locale;
  products: ProductWithVariants[];
}) {
  const scrollerRef = useRef<HTMLUListElement>(null);

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    // In RTL browsers report negative scrollLeft increments; multiplying by the
    // visual direction keeps `next` always advancing forward in reading order.
    const rtl = locale === "ar";
    el.scrollBy({ left: (rtl ? -1 : 1) * dir * 290, behavior: "smooth" });
  };

  const Prev = locale === "ar" ? ChevronRight : ChevronLeft;
  const Next = locale === "ar" ? ChevronLeft : ChevronRight;
  const Forward = locale === "ar" ? ArrowLeft : ArrowRight;

  return (
    // `id` used as an in-page anchor target from the Hero's
    // secondary CTA (`href="#best-sellers"`). `scroll-mt` gives the
    // sticky navbar clearance so the section header lands below it.
    <section id="best-sellers" className="scroll-mt-20 bg-surface py-8 md:py-24">
      <div className="mx-auto max-w-[1200px] px-6 md:px-12">
        <header className="mb-5 flex items-end justify-between gap-4 md:mb-8">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-brass-700">
              {locale === "ar"
                ? "اختيار عملائنا هذا الشهر"
                : "This month's picks"}
            </p>
            <h2 className="font-display mt-1 text-2xl text-navy-900 md:mt-2 md:text-4xl">
              {locale === "ar" ? "الأكثر طلباً" : "Most wanted"}
            </h2>
          </div>

          <div className="hidden gap-2 md:flex">
            <button
              type="button"
              aria-label={locale === "ar" ? "السابق" : "Previous"}
              onClick={() => scrollBy(-1)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white text-navy-700 transition hover:border-brass-300 hover:bg-paper"
            >
              <Prev className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label={locale === "ar" ? "التالي" : "Next"}
              onClick={() => scrollBy(1)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white text-navy-700 transition hover:border-brass-300 hover:bg-paper"
            >
              <Next className="h-5 w-5" />
            </button>
          </div>
        </header>

        <ul
          ref={scrollerRef}
          className="scroll-row -mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-2 md:-mx-12 md:gap-5 md:px-12 md:scroll-smooth"
        >
          {products.map((p) => (
            <li
              key={p.id}
              className="w-[270px] shrink-0 snap-start md:w-[290px]"
            >
              {/* urgencyStockThreshold=10 → fire-emoji + warning red at
                  any stock ≤ 10; ≤ 5 also pulses. The OOS overlay on the
                  card image still handles stock = 0 with its own
                  "غير متوفر" badge, so no extra handling needed here. */}
              <ProductCard
                product={p}
                locale={locale}
                sizes="290px"
                urgencyStockThreshold={10}
              />
            </li>
          ))}
        </ul>

        {/* Bottom-of-rail CTA — same pattern as CollectionsSection.
            Catches the scroll-to-end intent (user browsed the rail and
            wants "and what else?" without hunting for a top-nav catalog
            link). Navy button matches the "See all N collections" CTA
            visual for cross-section consistency. */}
        <div className="mt-8 flex justify-center md:mt-12">
          <Link
            href={`/${locale}/catalog`}
            className="inline-flex items-center gap-2 rounded-full border border-navy-900 bg-navy-900 px-7 py-3.5 text-sm font-semibold text-paper transition hover:bg-navy-800"
          >
            {locale === "ar" ? "شوف كل المنتجات" : "See all products"}
            <Forward className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
