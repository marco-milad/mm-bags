"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
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

  return (
    <section className="bg-surface py-8 md:py-24">
      <div className="mx-auto max-w-[1200px] px-6 md:px-12">
        <header className="mb-5 flex items-end justify-between gap-4 md:mb-8">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-brass-700">
              {locale === "ar" ? "اختيار العملاء" : "Best sellers"}
            </p>
            <h2 className="font-display mt-1 text-2xl text-navy-900 md:mt-2 md:text-4xl">
              {locale === "ar" ? "الأكثر مبيعاً" : "Customer favourites"}
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
      </div>
    </section>
  );
}
