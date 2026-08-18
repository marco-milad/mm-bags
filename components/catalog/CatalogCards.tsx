import type { Locale } from "@/lib/i18n-config";
import type { CatalogCardProduct } from "@/lib/catalog-shared";
import { ProductCard } from "@/components/product/ProductCard";

/** How many cards get `priority` (eager, preloaded) — the first two
    rows on the 2-column mobile grid, i.e. the LCP candidates. */
const PRIORITY_CARDS = 4;

/**
 * The <li> cards of one catalog page. Server component, used both for
 * the SSR'd first page (inside CatalogView) and by the "load more"
 * server action, so appended pages render exactly like the first one.
 *
 * `startIndex` is the absolute position of `products[0]` in the whole
 * list — only the very first cards of the very first page are eager;
 * everything appended later is below the fold by definition.
 */
export function CatalogCards({
  products,
  locale,
  startIndex = 0,
}: {
  products: CatalogCardProduct[];
  locale: Locale;
  startIndex?: number;
}) {
  return (
    <>
      {products.map((product, i) => (
        <li key={product.id} className="h-full">
          <ProductCard
            product={product}
            locale={locale}
            priority={startIndex + i < PRIORITY_CARDS}
            prefetch={false}
          />
        </li>
      ))}
    </>
  );
}
