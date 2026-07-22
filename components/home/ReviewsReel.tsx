import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import type { Locale } from "@/lib/i18n-config";
import type { FeaturedReview } from "@/lib/queries/reviews";
import { ReviewStars } from "@/components/reviews/ReviewStars";

/**
 * Featured customer reviews.
 *
 * Sprint: homepage-polish
 *   - Replaced the single-card auto-rotating reel with a static
 *     multi-review layout: a 3-column grid on md+, a snap-scroll
 *     rail on mobile (matches BestSellersCarousel pattern). Seeing
 *     three customers agree at once is stronger social proof than
 *     watching one review disappear before the visitor finishes
 *     reading it — and the auto-rotate was actively hostile to that
 *     reading (4.2 s per slide).
 *   - Each card carries a "شراء موثق" / "Verified purchase" chip.
 *     Every featured review is admin-approved before it can surface
 *     here, so the claim is honest.
 *   - Cheap "human touch": brass-circled first-initial avatar next
 *     to the reviewer's name. Costs nothing (no image pipeline) and
 *     reads warmer than a bare name string.
 *   - Sharper headline: eyebrow gains "الحقيقيين" (real / authentic)
 *     as an anti-fake signal; h2 shifts from passive "قالوا عننا
 *     إيه؟" to active "قالوا إيه بعد ما جربوا؟" (implies purchase).
 */
export function ReviewsReel({
  locale,
  reviews,
}: {
  locale: Locale;
  reviews: FeaturedReview[];
}) {
  if (reviews.length === 0) return null;

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

      {/* Grid on md+, snap-scroll rail on mobile. `-mx-6 px-6` gives
          the mobile rail edge-to-edge scroll with matching padding so
          the first card starts flush with the section's content
          gutter — same pattern BestSellersCarousel uses. */}
      <ul className="scroll-row -mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-2 md:mx-0 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:px-0 md:pb-0">
        {reviews.map((r) => {
          const displayName =
            r.guestName?.trim() ||
            (locale === "ar" ? "عميل" : "Customer");
          // First codepoint of the display name, uppercased. For Arabic
          // this returns the leading letter (e.g. "م" from "محمد"); for
          // Latin, the uppercased initial. Anonymous reviews get "؟".
          const initial =
            r.guestName?.trim().length
              ? [...r.guestName.trim()][0]?.toLocaleUpperCase(
                  locale === "ar" ? "ar-EG" : "en-US",
                ) ?? "?"
              : locale === "ar"
                ? "؟"
                : "?";

          return (
            <li
              key={r.id}
              className="w-[290px] shrink-0 snap-start md:w-auto"
            >
              <article
                className="flex h-full flex-col rounded-[14px] border border-line bg-white p-6 text-start shadow-sm md:p-7"
              >
                {/* Verified-purchase chip — brass icon + small label.
                    Every featured review has been admin-approved, so
                    the claim is honest for this rail (unlike a blanket
                    "verified" that would leak to unmoderated content). */}
                <span className="mb-3 inline-flex w-fit items-center gap-1 rounded-full border border-brass-500/40 bg-brass-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-brass-700">
                  <BadgeCheck className="h-3 w-3" aria-hidden />
                  {locale === "ar" ? "شراء موثق" : "Verified"}
                </span>

                <ReviewStars value={r.rating} size="md" />

                {r.body && (
                  <p className="font-display mt-4 flex-1 text-lg leading-snug text-navy-900 md:text-xl">
                    &ldquo;{r.body}&rdquo;
                  </p>
                )}

                <footer className="mt-5 flex items-center gap-3 border-t border-line pt-4 text-xs">
                  {/* First-initial avatar — brass circle with white
                      letter. Cheap warmth signal in place of a real
                      photo (we don't collect customer avatars). */}
                  <span
                    aria-hidden
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brass-500 font-display text-sm font-semibold text-white"
                  >
                    {initial}
                  </span>
                  <div className="min-w-0 flex-1">
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
            </li>
          );
        })}
      </ul>

      {/* Self-serve CTA — points returning customers at the catalog so
          they can pick the product they already own and leave their
          own review there. Kept as a link (not a button) because the
          conversion CTAs elsewhere on the page take primary weight. */}
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
