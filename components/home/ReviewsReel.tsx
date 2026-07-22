"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Quote,
} from "lucide-react";
import type { Locale } from "@/lib/i18n-config";
import type { FeaturedReview } from "@/lib/queries/reviews";
import { ReviewStars } from "@/components/reviews/ReviewStars";

// Auto-rotate cadence per Marco's spec: 3.5 s per slide, brisk
// enough to feel alive but slow enough for a two-line quote to be
// readable. Pauses on hover (desktop) and on any dot/arrow click.
const ROTATE_MS = 3500;

/**
 * Featured customer reviews — single-card auto-rotating carousel.
 *
 * Layout borrowed from the OJOS Studio testimonials pattern Marco
 * pointed at: one big centered card, arrow controls floating on the
 * sides, a dot pager below (active dot widens to a brass bar), and
 * a "hover to pause" hint. Each card carries the verified-purchase
 * chip and initial-avatar improvements added in the previous
 * revision (they survive the layout swap).
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
    const t = setInterval(
      () => setI((n) => (n + 1) % reviews.length),
      ROTATE_MS,
    );
    return () => clearInterval(t);
  }, [paused, reviews.length]);

  if (reviews.length === 0) return null;

  const r = reviews[i];
  const goPrev = () =>
    setI((n) => (n - 1 + reviews.length) % reviews.length);
  const goNext = () => setI((n) => (n + 1) % reviews.length);

  // RTL: the arrow that visually points "back" is the one whose
  // glyph aims toward the reading start. In Arabic the story flows
  // right-to-left, so the "previous" arrow is a ChevronRight.
  const Prev = locale === "ar" ? ChevronRight : ChevronLeft;
  const Next = locale === "ar" ? ChevronLeft : ChevronRight;

  const displayName =
    r.guestName?.trim() || (locale === "ar" ? "عميل" : "Customer");
  const initial = r.guestName?.trim().length
    ? [...r.guestName.trim()][0]?.toLocaleUpperCase(
        locale === "ar" ? "ar-EG" : "en-US",
      ) ?? "?"
    : locale === "ar"
      ? "؟"
      : "?";

  return (
    <section className="mx-auto max-w-[1200px] px-6 py-12 md:px-12 md:py-24">
      <header className="mb-10 flex flex-col items-center gap-2 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-brass-700">
          {locale === "ar" ? "آراء عملائنا الحقيقيين" : "Real customer voices"}
        </p>
        <h2 className="font-display text-3xl text-navy-900 md:text-4xl">
          {locale === "ar" ? "قالوا إيه بعد ما جربوا؟" : "What they say after trying"}
        </h2>
      </header>

      {/* Carousel viewport — hover on the whole surrounding block
          pauses the timer. Positioned so the floating arrow buttons
          sit outside the card on desktop (via translate-x) but stay
          on the card edges on mobile where the section is narrower. */}
      <div
        className="relative mx-auto max-w-3xl"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* Prev arrow — RTL-aware. Hidden on mobile to reduce visual
            clutter; touch users navigate via dots + tap-to-jump. */}
        {reviews.length > 1 && (
          <button
            type="button"
            onClick={() => {
              setPaused(true);
              goPrev();
            }}
            aria-label={locale === "ar" ? "السابق" : "Previous"}
            className="absolute top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-white text-navy-700 shadow-md transition hover:border-brass-500 hover:text-brass-700 md:flex ltr:-left-4 ltr:md:-left-6 rtl:-right-4 rtl:md:-right-6"
          >
            <Prev className="h-5 w-5" />
          </button>
        )}

        {/* The card. Keying by review id remounts on slide change so
            the rise-in animation fires cleanly per slide. `min-h-*`
            stops the section from jumping when short/long reviews
            cycle. */}
        <article
          key={r.id}
          aria-live="polite"
          className="relative flex min-h-[280px] flex-col rounded-2xl border border-line bg-white p-8 shadow-sm md:min-h-[320px] md:p-12"
          style={{
            animation: "mm-rise 0.6s cubic-bezier(0.22,1,0.36,1) both",
          }}
        >
          {/* Big decorative quote watermark — brass-tinted, low
              opacity. Sits behind the content and gives the card the
              editorial "testimonial" tell without adding any real
              text weight. */}
          <Quote
            aria-hidden
            className="pointer-events-none absolute h-20 w-20 text-brass-500/15 ltr:top-6 ltr:left-6 rtl:top-6 rtl:right-6 md:h-24 md:w-24"
          />

          {/* Verified-purchase chip. Every featured review is admin-
              approved before it surfaces here, so the claim is honest
              for THIS rail. */}
          <span className="relative z-10 mb-3 inline-flex w-fit items-center gap-1 rounded-full border border-brass-500/40 bg-brass-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-brass-700">
            <BadgeCheck className="h-3 w-3" aria-hidden />
            {locale === "ar" ? "شراء موثق" : "Verified"}
          </span>

          <div className="relative z-10">
            <ReviewStars value={r.rating} size="lg" />
          </div>

          {r.body && (
            <p className="font-display relative z-10 mt-5 flex-1 text-xl leading-snug text-navy-900 md:text-2xl">
              &ldquo;{r.body}&rdquo;
            </p>
          )}

          <footer className="relative z-10 mt-6 flex items-center gap-3 border-t border-line pt-5 text-xs">
            {/* First-initial avatar — brass circle, cheap warmth
                signal in place of a real photograph. */}
            <span
              aria-hidden
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brass-500 font-display text-base font-semibold text-white"
            >
              {initial}
            </span>
            <div className="min-w-0 flex-1 text-start">
              <p className="truncate font-semibold text-navy-900">
                {displayName}
                {r.governorate && (
                  <span className="font-normal text-ink-500">
                    {" · "}
                    {r.governorate}
                  </span>
                )}
              </p>
              <Link
                href={`/${locale}/products/${r.productSlug}`}
                className="block truncate text-brass-700 underline-offset-4 hover:underline"
              >
                {locale === "ar" ? r.productNameAr : r.productNameEn}
              </Link>
            </div>
          </footer>
        </article>

        {reviews.length > 1 && (
          <button
            type="button"
            onClick={() => {
              setPaused(true);
              goNext();
            }}
            aria-label={locale === "ar" ? "التالي" : "Next"}
            className="absolute top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-white text-navy-700 shadow-md transition hover:border-brass-500 hover:text-brass-700 md:flex ltr:-right-4 ltr:md:-right-6 rtl:-left-4 rtl:md:-left-6"
          >
            <Next className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Dot pager + hover-to-pause hint. The active dot widens to a
          brass bar (per the site's existing MOTION spec, matches the
          previous version of this component). */}
      {reviews.length > 1 && (
        <div className="mt-6 flex flex-col items-center gap-3">
          <div
            role="tablist"
            aria-label={locale === "ar" ? "آراء العملاء" : "Customer reviews"}
            className="flex gap-2"
          >
            {reviews.map((rv, idx) => {
              const active = idx === i;
              return (
                <button
                  key={rv.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-label={`${
                    locale === "ar" ? "رأي" : "Review"
                  } ${idx + 1}`}
                  onClick={() => {
                    setPaused(true);
                    setI(idx);
                  }}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    active
                      ? "w-8 bg-brass-500"
                      : "w-1.5 bg-line hover:bg-ink-400"
                  }`}
                />
              );
            })}
          </div>
          <p className="text-[11px] text-ink-500">
            {locale === "ar"
              ? "مرّر الماوس فوق البطاقة لإيقاف التبديل"
              : "Hover the card to pause"}
          </p>
        </div>
      )}

      {/* Self-serve CTA — points returning customers at the catalog
          so they can leave their own review on the specific PDP they
          own. */}
      <div className="mt-10 flex flex-col items-center gap-2 text-center">
        <p className="text-sm text-ink-500">
          {locale === "ar"
            ? "عندك تجربة مع M.M Bags؟"
            : "Have you shopped with M.M Bags?"}
        </p>
        <a
          href={`/${locale}/catalog`}
          className="inline-flex items-center gap-1.5 rounded-full border border-brass-500 bg-brass-500/10 px-5 py-2 text-sm font-semibold text-navy-900 transition hover:bg-brass-500 hover:text-white"
        >
          {locale === "ar" ? "شاركنا رأيك" : "Share your review"}
          <span aria-hidden>{locale === "ar" ? "←" : "→"}</span>
        </a>
      </div>
    </section>
  );
}
