"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n-config";
import type { FeaturedReview } from "@/lib/queries/reviews";
import { ReviewStars } from "@/components/reviews/ReviewStars";

const ROTATE_MS = 4200;

/**
 * Auto-advancing testimonial reel. Fade+rise between slides, pause on hover.
 * Active dot widens to a brass bar (per MOTION spec).
 */
export function ReviewsReel({
  locale,
  reviews,
}: {
  locale: Locale;
  reviews: FeaturedReview[];
}) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || reviews.length <= 1) return;
    const t = setInterval(() => setI((n) => (n + 1) % reviews.length), ROTATE_MS);
    return () => clearInterval(t);
  }, [paused, reviews.length]);

  if (reviews.length === 0) return null;

  const r = reviews[i];

  return (
    <section className="mx-auto max-w-[1200px] px-6 py-20 md:px-12 md:py-24">
      <header className="mb-10 flex flex-col items-center gap-2 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-brass-700">
          {locale === "ar" ? "آراء عملائنا" : "Customer voices"}
        </p>
        <h2 className="font-display text-3xl text-navy-900 md:text-4xl">
          {locale === "ar" ? "قالوا عننا إيه؟" : "What they say"}
        </h2>
      </header>

      <div
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        className="mx-auto max-w-3xl"
      >
        <article
          // key remounts on slide change so the rise animation re-fires
          key={r.id}
          className="rounded-[14px] border border-line bg-white p-8 text-center shadow-sm md:p-12"
          style={{
            animation: "mm-rise 0.6s cubic-bezier(0.22,1,0.36,1) both",
          }}
          aria-live="polite"
        >
          <ReviewStars value={r.rating} size="lg" />
          {r.body && (
            <p className="font-display mt-5 text-xl leading-snug text-navy-900 md:text-2xl">
              &ldquo;{r.body}&rdquo;
            </p>
          )}
          <footer className="mt-6 flex flex-col items-center gap-1 border-t border-line pt-5 text-xs">
            <p className="font-semibold text-navy-900">
              {r.guestName ?? (locale === "ar" ? "عميل" : "Customer")}
              {r.governorate && (
                <span className="font-normal text-ink-500"> · {r.governorate}</span>
              )}
            </p>
            <Link
              href={`/${locale}/products/${r.productSlug}`}
              className="text-brass-700 underline-offset-4 hover:underline"
            >
              {locale === "ar" ? r.productNameAr : r.productNameEn}
            </Link>
          </footer>
        </article>

        {/* Dot nav — active dot widens to a brass bar */}
        {reviews.length > 1 && (
          <div
            role="tablist"
            aria-label={locale === "ar" ? "آراء العملاء" : "Customer reviews"}
            className="mt-6 flex justify-center gap-2"
          >
            {reviews.map((rv, idx) => {
              const active = idx === i;
              return (
                <button
                  key={rv.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-label={`${locale === "ar" ? "رأي" : "Review"} ${idx + 1}`}
                  onClick={() => setI(idx)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    active
                      ? "w-8 bg-brass-500"
                      : "w-1.5 bg-line hover:bg-ink-400"
                  }`}
                />
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
