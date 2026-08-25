import "server-only";

import { revalidatePath } from "next/cache";

/**
 * Public-route invalidation for mutations that change what shoppers see.
 *
 * Every public surface renders product data straight from Supabase, so a
 * sale, a restock or an admin edit leaves the rendered pages describing
 * stock and prices that no longer exist. Nothing invalidated them: before
 * this module every revalidatePath in the codebase pointed at /admin.
 *
 * Today the public routes are all dynamic, so these calls mostly clear the
 * client Router Cache. They are the prerequisite for ISR on the product
 * pages and the homepage — that is what they are here for.
 *
 * Two rules shape the design:
 *
 *  1. No mutation may pay a database round-trip just to learn a slug.
 *     Checkout, POS, returns and the expiry sweep know variant and product
 *     ids but never the slug, and adding a lookup to the hot purchase path
 *     to serve the cache would be the wrong trade. Those callers omit the
 *     slug and invalidate every product page instead — a broader sweep of
 *     cache entries costs nothing at mutation time.
 *
 *  2. /catalog is included even though it is permanently dynamic
 *     (it reads searchParams, so it can never be prerendered). The call is
 *     a no-op for the server cache but still drops the client-side entry,
 *     and it keeps the intent readable if the route is ever restructured.
 */

const LOCALES = ["ar", "en"] as const;

/** The app-directory pattern for the product route, used to invalidate
 *  every product page at once when the specific slug isn't known. */
const PRODUCT_ROUTE = "/[locale]/products/[slug]";

/**
 * Availability, price or content of product data changed.
 *
 * Pass `slug` when the mutation already has it; omit it and every product
 * page is invalidated rather than querying for one slug. Either way the
 * homepage (best-sellers, spotlight) and the catalog grid are included —
 * both reprint the same stock badge and price.
 */
export function revalidateProduct(slug?: string | null): void {
  for (const locale of LOCALES) {
    if (slug) revalidatePath(`/${locale}/products/${slug}`);
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/catalog`);
  }
  if (!slug) revalidatePath(PRODUCT_ROUTE, "page");
}

/**
 * Everything revalidateProduct covers, plus /categories.
 *
 * Reach for this when a mutation moves what the category cards render:
 * their product counts (create, delete, `is_active`) or the cover image and
 * `minPrice` they derive from `products.images` and
 * `sale_price ?? base_price`.
 *
 * Note `minPrice` deliberately ignores variant-level `price_override`
 * (see TopLevelCategory in lib/queries/categories.ts), so variant pricing
 * cannot stale this page and saveVariant stays on revalidateProduct.
 *
 * `slug` is forwarded so callers that know which product changed keep the
 * precise page invalidation instead of sweeping every product page.
 */
export function revalidateCatalogSet(slug?: string | null): void {
  revalidateProduct(slug);
  for (const locale of LOCALES) {
    revalidatePath(`/${locale}/categories`);
  }
}
