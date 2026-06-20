import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Locale } from "@/lib/i18n-config";
import type { ProductDetail } from "@/lib/queries/catalog";
import { effectivePrice } from "@/lib/catalog-shared";
import { formatPriceEGP } from "@/lib/utils";
import { ProductSpecsChips } from "@/components/product/ProductSpecs";
import { FeaturedProductInteractive } from "./FeaturedProductInteractive";

/**
 * Homepage Featured section. Server component — fetches the data in the
 * page above and renders the layout; pushes anything stateful (gallery
 * thumb-swap, color swatches, add-to-cart) into FeaturedProductInteractive.
 */
export function FeaturedProduct({
  locale,
  product,
}: {
  locale: Locale;
  product: ProductDetail;
}) {
  const isRTL = locale === "ar";
  const Forward = isRTL ? ArrowLeft : ArrowRight;

  const name = isRTL ? product.name_ar : product.name_en;
  const otherName = isRTL ? product.name_en : product.name_ar;
  const collectionLabel = product.collection
    ? isRTL
      ? product.collection.name_ar
      : product.collection.name_en
    : null;

  const price = effectivePrice(product);
  const hasSale =
    product.sale_price !== null && product.sale_price < product.base_price;
  const savings = hasSale
    ? Math.round(
        ((product.base_price - (product.sale_price ?? 0)) / product.base_price) *
          100,
      )
    : 0;

  return (
    <section className="bg-[var(--color-surface)]" aria-labelledby="featured-heading">
      <div className="mx-auto max-w-[1360px] px-6 py-12 md:px-12 md:py-24">
        {/* Section header */}
        <header className="mb-10 flex flex-col gap-2 text-center md:mb-14">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--color-accent-dark)]">
            {isRTL ? "منتج مميز" : "Featured"}
          </p>
          <h2
            id="featured-heading"
            className="font-display text-3xl text-[var(--color-text)] md:text-4xl"
          >
            {isRTL ? "الأكثر طلباً هذا الموسم" : "Most wanted this season"}
          </h2>
        </header>

        {/* Body — 2-col on lg, stacked below. `[&>*]:min-w-0` overrides
            CSS Grid's default min-width: auto (= min-content) on items
            below the lg breakpoint, where the explicit minmax(0, ...)
            tracks aren't active yet. Without it the gallery's intrinsic
            image width drags the single mobile column past 100 vw and
            `overflow-x-clip` on <main> hides the bleed — the screenshot
            symptom: image card pinned to the start, empty trailing
            white space. Same fix shape as ProductDetailLayout.tsx:106. */}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,560px)_minmax(0,1fr)] lg:items-start lg:gap-12 xl:gap-16 [&>*]:min-w-0">
          {/* LEFT — gallery (interactive thumb-swap lives in the client subtree
              for everything below the eyebrow; gallery is part of it). */}
          {/* RIGHT — eyebrow + name + price + specs + swatches + CTAs */}
          <FeaturedProductInteractive
            locale={locale}
            product={product}
            header={
              <header className="flex flex-col gap-4">
                {collectionLabel && (
                  <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--color-text-secondary)]">
                    {collectionLabel}
                  </p>
                )}
                <h3 className="font-display text-3xl leading-tight text-[var(--color-text)] md:text-4xl">
                  {name}
                </h3>
                <p className="font-mono text-xs text-[var(--color-text-secondary)]">
                  {otherName}
                </p>

                {/* Price + sale */}
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="font-mono text-2xl font-semibold text-[var(--color-primary)]">
                    {formatPriceEGP(price, locale)}
                  </span>
                  {hasSale && (
                    <>
                      <span className="font-mono text-sm text-[var(--color-text-secondary)] line-through">
                        {formatPriceEGP(product.base_price, locale)}
                      </span>
                      <span className="rounded-full bg-[var(--color-accent)] px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-[var(--color-primary)]">
                        -{savings}%
                      </span>
                    </>
                  )}
                </div>

                {/* Specs chips (dimensions, weight, material) — re-uses the same
                    component the catalog card uses, capped at 3 to keep the
                    eyebrow row visually quiet. */}
                <ProductSpecsChips product={product} locale={locale} max={3} />
              </header>
            }
            footer={
              <Link
                href={`/${locale}/products/${product.slug}`}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-primary)] underline-offset-4 hover:underline"
              >
                {isRTL ? "عرض المنتج كاملاً" : "View full product"}
                <Forward className="h-4 w-4" />
              </Link>
            }
          />
        </div>
      </div>
    </section>
  );
}
