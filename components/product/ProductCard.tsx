import Link from "next/link";
import type { Locale } from "@/lib/i18n-config";
import { cn, formatPriceEGP } from "@/lib/utils";
import { effectivePrice, totalStock, type ProductWithVariants } from "@/lib/catalog-shared";
import { WishlistButton } from "@/components/product/WishlistButton";
import { ProductSpecsChips } from "@/components/product/ProductSpecs";
import { ImageContainer } from "@/components/product/ImageContainer";
import { QuickViewTrigger } from "@/components/product/QuickViewTrigger";

/**
 * Default `sizes` matches the catalog grid (CatalogView): 2-col mobile,
 * 3-col md+, 4-col lg+. Carousels and other fixed-width hosts should pass
 * their own `sizes` so the image optimizer doesn't ship more bytes than
 * the rendered card is wide.
 */
const DEFAULT_SIZES = "(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw";

export function ProductCard({
  product,
  locale,
  sizes = DEFAULT_SIZES,
  urgencyStockThreshold,
}: {
  product: ProductWithVariants;
  locale: Locale;
  /** Override the `sizes` attribute for hosts that render the card at a
      different width than the catalog grid (e.g. BestSellersCarousel
      uses a fixed ~290px card; pass `sizes="290px"` there). */
  sizes?: string;
  /** When set, the under-price low-stock line switches to the "urgency"
      treatment used on best-sellers: fire emoji at any value ≤ this
      threshold, pulse animation at values ≤ 5, and a stronger color.
      Leave undefined for the standard catalog look (which only shows a
      muted "Only N left" line at ≤ 5). */
  urgencyStockThreshold?: number;
}) {
  const name = locale === "ar" ? product.name_ar : product.name_en;
  const price = effectivePrice(product);
  const hasSale = product.sale_price !== null && product.sale_price < product.base_price;
  const savings =
    hasSale && product.sale_price !== null
      ? Math.round(((product.base_price - product.sale_price) / product.base_price) * 100)
      : 0;
  const stock = totalStock(product);
  const isOOS = stock === 0;
  // Two distinct low-stock displays.
  // - "urgent": opt-in via urgencyStockThreshold. Shows fire + warning red
  //   for any value within the threshold; ≤5 also pulses.
  // - "standard": catalog default — quiet "Only N left" at ≤5.
  const urgentLow =
    !isOOS &&
    urgencyStockThreshold !== undefined &&
    stock <= urgencyStockThreshold;
  const urgentPulse = urgentLow && stock <= 5;
  const standardLow =
    !isOOS && urgencyStockThreshold === undefined && stock <= 5;
  const primaryImage = product.images?.[0];
  const secondaryImage = product.images?.[1];

  return (
    <Link
      href={`/${locale}/products/${product.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] transition hover:shadow-lg"
    >
      {primaryImage ? (
        <ImageContainer
          src={primaryImage}
          secondarySrc={secondaryImage ?? null}
          alt={name}
          fit={product.image_fit}
          aspect={product.image_aspect}
          sizes={sizes}
        >
          <WishlistButton
            locale={locale}
            product={{
              productId: product.id,
              productSlug: product.slug,
              name_ar: product.name_ar,
              name_en: product.name_en,
              image: primaryImage,
            }}
          />
          {hasSale && !isOOS && (
            <span className="absolute top-3 z-10 rounded-full bg-[var(--color-accent)] px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-[var(--color-primary)] ltr:left-3 rtl:right-3">
              -{savings}%
            </span>
          )}
          {isOOS && (
            <span className="absolute inset-x-0 bottom-0 z-10 bg-[var(--color-primary)]/90 py-2 text-center text-xs font-medium text-white">
              {locale === "ar" ? "غير متوفر حالياً" : "Out of stock"}
            </span>
          )}
          {/* Quick view — hover-revealed pill, desktop only. Hidden when
              the card is OOS since the modal's primary CTA (add to cart)
              wouldn't be available anyway. */}
          {!isOOS && <QuickViewTrigger product={product} locale={locale} />}
        </ImageContainer>
      ) : (
        <div className="relative flex aspect-square w-full items-center justify-center bg-[var(--color-surface-2)] text-xs text-[var(--color-text-secondary)]">
          {locale === "ar" ? "بدون صورة" : "No image"}
        </div>
      )}

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-sm font-medium text-[var(--color-text)]">{name}</h3>

        <div className="mt-auto flex items-baseline gap-2">
          <span className="font-mono text-base font-semibold text-[var(--color-primary)]">
            {formatPriceEGP(price, locale)}
          </span>
          {hasSale && (
            <span className="font-mono text-xs text-[var(--color-text-secondary)] line-through">
              {formatPriceEGP(product.base_price, locale)}
            </span>
          )}
        </div>

        {standardLow && (
          <p className="text-[11px] text-[var(--color-warning)]">
            {locale === "ar" ? `باقي ${stock} قطع فقط!` : `Only ${stock} left!`}
          </p>
        )}

        {urgentLow && (
          <p
            className={cn(
              "text-[11px] font-semibold text-[var(--color-error)]",
              urgentPulse && "animate-pulse",
            )}
          >
            {locale === "ar"
              ? `باقي ${stock} قطعة فقط! 🔥`
              : `Only ${stock} left! 🔥`}
          </p>
        )}

        {/* Up to 3 spec chips — skipped automatically when product has no specs */}
        <ProductSpecsChips product={product} locale={locale} max={3} />
      </div>
    </Link>
  );
}
