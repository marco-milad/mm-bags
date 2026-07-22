import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Tag } from "lucide-react";
import type { Locale } from "@/lib/i18n-config";
import type { TopLevelCategory } from "@/lib/queries/categories";
import { Reveal } from "@/components/shared/Reveal";
import { cn, formatPriceEGP } from "@/lib/utils";

/**
 * Collections grid — full-bleed image cards with a dark gradient and the
 * collection name set in Cormorant display over the image.
 *
 * Post-elevation (Sprint: homepage-polish):
 *   - Section headline sharper ("لكل رحلة، شنطة" / "For every trip, a bag")
 *     — decisive framing beats the previous generic "All you need".
 *   - Card badge shows a *price hint* ("من 350 ج.م") instead of a bare
 *     product count. In the Egyptian market the first question a
 *     visitor asks is "how much does it start at?"; answering it in
 *     the card cuts the bounce-to-catalog loop just to check price.
 *     Falls back to hiding the chip when a collection has no priced
 *     products yet.
 *   - Featured treatment: the FIRST card spans 2 columns on md+ (same
 *     row height as siblings via aspect-[8/5] vs 4/5), a magazine-
 *     style hero-tile pattern used by premium travel brands. On
 *     mobile every card stays same-sized to keep the 2-col grid
 *     symmetric.
 *   - Mobile tap-affordance: the "Shop now" arrow is wrapped in a
 *     subtle brass pill so touch users perceive the card as tappable
 *     without needing hover state.
 *   - Bottom "See all collections" CTA (a real button, not a small
 *     link) captures the scroll-to-end intent that the header link
 *     misses.
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
            {isRTL ? "اختار عالمك" : "Pick your world"}
          </p>
          <h2 className="font-display mt-2 text-3xl text-navy-900 md:text-4xl">
            {isRTL ? "لكل رحلة، شنطة" : "For every trip, a bag"}
          </h2>
        </div>
        {/* Top link stays for keyboard-driven users / scannability;
            a stronger button repeats at the bottom for the more common
            scroll-to-end intent. */}
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
          const featured = i === 0;
          return (
            <Reveal
              key={cat.slug}
              as="li"
              delay={stagger}
              className={featured ? "md:col-span-2" : undefined}
            >
              <Link
                href={`/${locale}/catalog/${cat.slug}`}
                className={cn(
                  "group relative block overflow-hidden rounded-2xl bg-navy-900 ring-1 ring-line transition duration-500 ease-out",
                  // Featured card gets a wider aspect on md+ (8/5) so
                  // that col-span-2 × 8/5 ≈ col-span-1 × 5/4 — same
                  // visual row height as its non-featured siblings.
                  // On mobile all cards stay 3/4 for a symmetric grid.
                  featured
                    ? "aspect-[3/4] md:aspect-[8/5]"
                    : "aspect-[3/4] md:aspect-[4/5]",
                )}
              >
                {/* Cover image */}
                <Image
                  src={cat.coverImage}
                  alt=""
                  fill
                  sizes={
                    featured
                      ? "(min-width: 768px) 66vw, 50vw"
                      : "(min-width: 768px) 33vw, 50vw"
                  }
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                />

                {/* Dark navy gradient — anchored to the bottom edge for text
                    legibility. Deepens on hover to dim the lifestyle photo
                    and bring the type forward. */}
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-navy-900 via-navy-900/60 to-navy-900/15 transition-opacity duration-500 group-hover:from-navy-900 group-hover:via-navy-900/75"
                />

                {/* Price-hint badge — top corner, RTL-aware. Answers
                    "how much?" up front for the Egyptian visitor. Hides
                    when the collection has no priced products yet. */}
                {cat.minPrice !== null && (
                  <span
                    className="absolute top-4 inline-flex items-center gap-1.5 rounded-full border border-brass-400/40 bg-navy-900/60 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-brass-100 backdrop-blur ltr:right-4 rtl:left-4"
                  >
                    <Tag className="h-3 w-3 text-brass-300" aria-hidden />
                    {isRTL
                      ? `من ${formatPriceEGP(cat.minPrice, locale)}`
                      : `From ${formatPriceEGP(cat.minPrice, locale)}`}
                  </span>
                )}

                {/* Caption block — bottom inline-start. Cormorant display for
                    the primary name, mono caption for the other-locale label,
                    brass pill CTA at the bottom. */}
                <div className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-1 p-5 text-paper md:p-7">
                  <h3
                    className={cn(
                      "font-display leading-[1.05]",
                      featured
                        ? "text-3xl md:text-5xl"
                        : "text-3xl md:text-4xl",
                    )}
                  >
                    {isRTL ? cat.name_ar : cat.name_en}
                  </h3>
                  <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-paper/65">
                    {isRTL ? cat.name_en : cat.name_ar}
                  </p>

                  {/* Brass pill instead of bare text — reads as a
                      button on touch, no hover state required. On
                      hover (desktop) it fills solid brass for a
                      "committed" affordance. */}
                  <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-brass-400/50 bg-brass-500/20 px-3 py-1.5 text-xs font-semibold text-brass-100 backdrop-blur-sm transition group-hover:gap-2.5 group-hover:border-brass-500 group-hover:bg-brass-500 group-hover:text-navy-900">
                    {isRTL ? "تسوق الآن" : "Shop now"}
                    <Forward className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            </Reveal>
          );
        })}
      </ul>

      {/* Bottom-of-grid CTA — real button, not a link. Catches the
          scroll-to-end intent that the header link misses (a user
          who's just browsed all the featured collections). */}
      <Reveal delay={200} className="mt-10 flex justify-center md:mt-14">
        <Link
          href={`/${locale}/categories`}
          className="inline-flex items-center gap-2 rounded-full border border-navy-900 bg-navy-900 px-7 py-3.5 text-sm font-semibold text-paper transition hover:bg-navy-800"
        >
          {isRTL
            ? `شوف كل الـ ${categories.length} تشكيلة`
            : `See all ${categories.length} collections`}
          <Forward className="h-4 w-4" />
        </Link>
      </Reveal>
    </section>
  );
}
