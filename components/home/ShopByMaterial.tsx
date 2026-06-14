import Link from "next/link";
import type { Locale } from "@/lib/i18n-config";
import type { MaterialBucketCount } from "@/lib/queries/catalog";
import { bucketById } from "@/lib/material-buckets";
import { Layers } from "lucide-react";

/**
 * Homepage Shop By Material section. Pure server component — receives the
 * pre-bucketed material families from `getMaterialCounts()` (capped at 8)
 * and renders one card per bucket. The card deep-links to the catalog with
 * `?materialBucket=<id>`, which expands to `IN (...)` over the bucket's
 * member `material_type` values on the server.
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

  return (
    <section
      className="bg-navy-900 text-paper"
      aria-labelledby="shop-by-material-heading"
    >
      <div className="mx-auto max-w-[1360px] px-6 py-12 md:px-12 md:py-24">
        <header className="mb-10 flex flex-col gap-2 text-center md:mb-14">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-brass-300">
            {isRTL ? "اعرف خامتك" : "Know your material"}
          </p>
          <h2
            id="shop-by-material-heading"
            className="font-display text-3xl md:text-4xl"
          >
            {isRTL ? "تسوق حسب الخامة" : "Shop By Material"}
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

                  <p className="font-mono text-[11px] uppercase tracking-wider text-brass-300">
                    {bucket.productCount}{" "}
                    {isRTL
                      ? "منتج"
                      : bucket.productCount === 1
                        ? "product"
                        : "products"}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
