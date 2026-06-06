import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/lib/i18n-config";
import { formatPriceEGP } from "@/lib/utils";
import { effectivePrice, totalStock, type ProductWithVariants } from "@/lib/catalog-shared";
import { WishlistButton } from "@/components/product/WishlistButton";
import { ProductSpecsChips } from "@/components/product/ProductSpecs";

export function ProductCard({
  product,
  locale,
}: {
  product: ProductWithVariants;
  locale: Locale;
}) {
  const name = locale === "ar" ? product.name_ar : product.name_en;
  const price = effectivePrice(product);
  const hasSale = product.sale_price !== null && product.sale_price < product.base_price;
  const savings =
    hasSale && product.sale_price !== null
      ? Math.round(((product.base_price - product.sale_price) / product.base_price) * 100)
      : 0;
  const stock = totalStock(product);
  const lowStock = stock > 0 && stock <= 5;
  const isOOS = stock === 0;
  const primaryImage = product.images?.[0];
  const secondaryImage = product.images?.[1];

  return (
    <Link
      href={`/${locale}/products/${product.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)] transition hover:shadow-lg"
    >
      <div className="relative aspect-square overflow-hidden bg-[var(--color-surface-2)]">
        <WishlistButton
          locale={locale}
          product={{
            productId: product.id,
            productSlug: product.slug,
            name_ar: product.name_ar,
            name_en: product.name_en,
            image: primaryImage ?? null,
          }}
        />
        {primaryImage ? (
          <Image
            src={primaryImage}
            alt={name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 90vw"
            className="object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-[var(--color-text-secondary)]">
            {locale === "ar" ? "بدون صورة" : "No image"}
          </div>
        )}
        {secondaryImage && (
          <Image
            src={secondaryImage}
            alt=""
            aria-hidden
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 90vw"
            className="object-cover opacity-0 transition duration-300 group-hover:opacity-100"
          />
        )}
        {hasSale && !isOOS && (
          <span className="absolute top-3 rounded-full bg-[var(--color-accent)] px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-[var(--color-primary)] ltr:left-3 rtl:right-3">
            -{savings}%
          </span>
        )}
        {isOOS && (
          <span className="absolute inset-x-0 bottom-0 bg-[var(--color-primary)]/90 py-2 text-center text-xs font-medium text-white">
            {locale === "ar" ? "غير متوفر حالياً" : "Out of stock"}
          </span>
        )}
      </div>

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

        {lowStock && (
          <p className="text-[11px] text-[var(--color-warning)]">
            {locale === "ar" ? `باقي ${stock} قطع فقط!` : `Only ${stock} left!`}
          </p>
        )}

        {/* Up to 3 spec chips — skipped automatically when product has no specs */}
        <ProductSpecsChips product={product} locale={locale} max={3} />
      </div>
    </Link>
  );
}
