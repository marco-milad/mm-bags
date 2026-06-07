import Link from "next/link";
import type { Locale } from "@/lib/i18n-config";
import type { MaterialCount } from "@/lib/queries/catalog";
import { materialIcon, materialNameAr } from "@/lib/materials-config";

/**
 * Homepage Shop By Material section. Pure server component — receives the
 * distinct material_type values + their active-product counts from a
 * getMaterialCounts() call in the page. New materials surface here
 * automatically (no hardcoded list); only the icon + AR display name are
 * looked up via the materials-config rule list, with sensible fallbacks
 * for unknown values.
 *
 * Dark navy section with brass accents for contrast against the cream
 * sections above and below it.
 */
export function ShopByMaterial({
  locale,
  materials,
}: {
  locale: Locale;
  materials: MaterialCount[];
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
          {materials.map(({ material_type, productCount }) => {
            const Icon = materialIcon(material_type);
            const labelAr = materialNameAr(material_type) || material_type;
            const display = isRTL ? labelAr : material_type;
            const sub = isRTL ? material_type : labelAr;
            return (
              <li key={material_type}>
                <Link
                  href={`/${locale}/catalog?material=${encodeURIComponent(material_type)}`}
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
                    {productCount}{" "}
                    {isRTL
                      ? "منتج"
                      : productCount === 1
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
