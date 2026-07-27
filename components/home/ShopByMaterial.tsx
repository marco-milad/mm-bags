import Link from "next/link";
import type { Locale } from "@/lib/i18n-config";
import type { MaterialBucketCount } from "@/lib/queries/catalog";
import { bucketById } from "@/lib/material-buckets";
import { ArrowLeft, ArrowRight, Layers } from "lucide-react";
import { formatPriceEGP } from "@/lib/utils";

/**
 * Homepage Shop By Material section — pure server component. Receives
 * pre-bucketed material families from `getMaterialCounts()` (capped
 * at 8) and renders one card per bucket. Each card deep-links to the
 * catalog with `?materialBucket=<id>` which expands to `IN (...)`
 * over the bucket's member `material_type` values on the server.
 *
 * Sprint: homepage-polish
 *   - Header shifted from descriptive ("Shop by material") to
 *     invitational ("اختار خامتك المفضلة" / "Pick your material").
 *   - Card meta below the name now shows a starting-price hint
 *     ("من 350 ج.م") instead of a bare product count. The Egyptian
 *     visitor asks "starts at how much?" before "how many options?";
 *     the price hint answers first, count is dropped. Falls back to
 *     the count when a bucket has no priced products (should be rare
 *     but guards against a mis-seeded row rendering "من 0 ج.م").
 *   - Bottom CTA — the visitor who's scanned all 8 material tiles
 *     wants a "and now show me everything" exit; a navy-border button
 *     to /catalog captures that intent without hunting the top nav.
 */
export function ShopByMaterial({
  locale,
  materials,
}: {
  locale: Locale;
  materials: MaterialBucketCount[];
}) {
  if (materials.length === 0) return null;
  const isRTL = locale === "ar";
  const Forward = isRTL ? ArrowLeft : ArrowRight;

  return (
    <section
      className="bg-navy-900 text-paper"
      aria-labelledby="shop-by-material-heading"
    >
      <div className="mx-auto max-w-[1360px] px-6 py-12 md:px-12 md:py-24">
        <header className="mb-10 flex flex-col gap-2 text-center md:mb-14">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-brass-300">
            {isRTL ? "الخامة أول قرار" : "Material comes first"}
          </p>
          <h2
            id="shop-by-material-heading"
            className="font-display text-3xl md:text-4xl"
          >
            {isRTL ? "اختار خامتك المفضلة" : "Pick your material"}
          </h2>
        </header>

        <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {materials.map((bucket) => {
            // Bucket meta (icon + canonical labels) comes from the same
            // rule list the query used — keeps display synced with the
            // groupings without duplicating data through the query layer.
            const meta = bucketById(bucket.id);
            const Icon = meta?.icon ?? Layers;
            const display = isRTL ? bucket.ar : bucket.en;
            const sub = isRTL ? bucket.en : bucket.ar;
            return (
              <li key={bucket.id}>
                <Link
                  href={`/${locale}/catalog?materialBucket=${bucket.id}`}
                  className="group flex h-full flex-col items-start gap-3 rounded-2xl border border-white/10 bg-navy-800/40 p-5 transition duration-300 hover:-translate-y-[3px] hover:border-brass-300 hover:bg-navy-800/70 md:p-6"
                >
                  <span
                    aria-hidden
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brass-500/15 text-brass-300 transition group-hover:bg-brass-500 group-hover:text-navy-900"
                  >
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                  </span>

                  <div className="flex flex-1 flex-col gap-1">
                    <h3 className="font-display text-lg leading-snug text-paper md:text-xl">
                      {display}
                    </h3>
                    {sub && sub !== display && (
                      <p className="font-mono text-[10px] uppercase tracking-wider text-paper/55">
                        {sub}
                      </p>
                    )}
                  </div>

                  {/* Card meta: prefer the starting-price hint, fall back
                      to a product count only when the bucket happens to
                      have no priced products yet (guards against showing
                      "من 0 ج.م" from a mis-seeded row). */}
                  <p className="font-mono text-[11px] uppercase tracking-wider text-brass-300">
                    {bucket.minPrice !== null
                      ? isRTL
                        ? `من ${formatPriceEGP(bucket.minPrice, locale)}`
                        : `From ${formatPriceEGP(bucket.minPrice, locale)}`
                      : `${bucket.productCount} ${
                          isRTL
                            ? "منتج"
                            : bucket.productCount === 1
                              ? "product"
                              : "products"
                        }`}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Bottom CTA — same pattern as Collections / BestSellers.
            Border-only so the section's navy field stays dominant,
            hover fills brass for the "committed" state. */}
        <div className="mt-10 flex justify-center md:mt-14">
          <Link
            href={`/${locale}/catalog`}
            className="inline-flex items-center gap-2 rounded-full border border-brass-500/60 px-7 py-3.5 text-sm font-semibold text-brass-300 transition hover:bg-brass-500 hover:text-navy-900"
          >
            {isRTL ? "استكشف كل المنتجات" : "Browse all products"}
            <Forward className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
