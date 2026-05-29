"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, Loader2, ShoppingBag, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n-config";
import type { ProductWithVariants } from "@/lib/catalog-shared";
import { effectivePrice, totalStock } from "@/lib/catalog-shared";
import { formatPriceEGP, cn } from "@/lib/utils";
import {
  useWishlistHydrated,
  useWishlistItems,
  useWishlistStore,
} from "@/store/wishlist";
import { useCartStore } from "@/store/cart";
import { dbWishlistRemove, getWishlistedProducts } from "@/lib/wishlist/actions";

export function WishlistGrid({ locale }: { locale: Locale }) {
  const hydrated = useWishlistHydrated();
  const items = useWishlistItems();
  const [products, setProducts] = useState<ProductWithVariants[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (items.length === 0) {
      setProducts([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getWishlistedProducts(items.map((i) => i.productId))
      .then((data) => {
        if (!cancelled) setProducts(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hydrated, items]);

  if (!hydrated || products === null || loading) {
    return (
      <div className="flex min-h-[30vh] items-center justify-center text-[var(--color-text-secondary)]">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (items.length === 0) {
    return <EmptyState locale={locale} />;
  }

  // Preserve wishlist order (most recent first) by sorting products to match items.
  const byId = new Map(products.map((p) => [p.id, p]));
  const ordered = items
    .map((i) => byId.get(i.productId))
    .filter((p): p is ProductWithVariants => !!p);

  // Items that exist in store but were deleted from DB get cleaned up below.
  const missingIds = items
    .map((i) => i.productId)
    .filter((id) => !byId.has(id));

  return (
    <>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ordered.map((p) => (
          <WishlistCard key={p.id} product={p} locale={locale} />
        ))}
      </ul>
      {missingIds.length > 0 && (
        <PruneStale locale={locale} ids={missingIds} />
      )}
    </>
  );
}

function WishlistCard({
  product,
  locale,
}: {
  product: ProductWithVariants;
  locale: Locale;
}) {
  const remove = useWishlistStore((s) => s.remove);
  const addToCart = useCartStore((s) => s.addItem);
  const openDrawer = useCartStore((s) => s.openDrawer);
  const [pending, setPending] = useState(false);

  const name = locale === "ar" ? product.name_ar : product.name_en;
  const price = effectivePrice(product);
  const hasSale =
    product.sale_price !== null && product.sale_price < product.base_price;
  const stock = totalStock(product);
  const isOOS = stock === 0;
  const primaryImage = product.images?.[0];

  const firstInStock = product.product_variants.find(
    (v) => (v.stock_qty ?? 0) > 0,
  );

  const onAdd = () => {
    if (!firstInStock) return;
    addToCart({
      variantId: firstInStock.id,
      productId: product.id,
      productSlug: product.slug,
      name_ar: product.name_ar,
      name_en: product.name_en,
      image: primaryImage ?? null,
      color_hex: firstInStock.color_hex,
      color_ar: firstInStock.color_ar,
      color_en: firstInStock.color_en,
      size_inches: firstInStock.size_inches,
      unitPrice: price,
    });
    openDrawer();
  };

  const onRemove = async () => {
    setPending(true);
    remove(product.id);
    await dbWishlistRemove(product.id);
  };

  return (
    <li className="flex flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]">
      <Link
        href={`/${locale}/products/${product.slug}`}
        className="relative block aspect-square overflow-hidden bg-[var(--color-surface-2)]"
      >
        {primaryImage && (
          <Image
            src={primaryImage}
            alt={name}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 90vw"
            className="object-cover"
          />
        )}
        {isOOS && (
          <span className="absolute inset-x-0 bottom-0 bg-[var(--color-primary)]/90 py-2 text-center text-xs font-medium text-white">
            {locale === "ar" ? "غير متوفر حالياً" : "Out of stock"}
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <Link
          href={`/${locale}/products/${product.slug}`}
          className="line-clamp-2 text-sm font-medium text-[var(--color-text)] hover:text-[var(--color-primary)]"
        >
          {name}
        </Link>

        <div className="flex items-baseline gap-2">
          <span className="font-mono text-base font-semibold text-[var(--color-primary)]">
            {formatPriceEGP(price, locale)}
          </span>
          {hasSale && (
            <span className="font-mono text-xs text-[var(--color-text-secondary)] line-through">
              {formatPriceEGP(product.base_price, locale)}
            </span>
          )}
        </div>

        <div className="mt-auto flex gap-2">
          <button
            type="button"
            onClick={onAdd}
            disabled={isOOS}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition",
              isOOS
                ? "cursor-not-allowed bg-[var(--color-surface)] text-[var(--color-text-secondary)]"
                : "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-light)]",
            )}
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            {locale === "ar" ? "أضف للكارت" : "Add to cart"}
          </button>
          <button
            type="button"
            onClick={onRemove}
            disabled={pending}
            aria-label={locale === "ar" ? "إزالة من المفضلة" : "Remove from wishlist"}
            className="flex items-center justify-center rounded-full border border-[var(--color-border)] px-3 py-2 text-[var(--color-text-secondary)] transition hover:border-[var(--color-error)] hover:text-[var(--color-error)] disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </li>
  );
}

function PruneStale({ locale, ids }: { locale: Locale; ids: string[] }) {
  const remove = useWishlistStore((s) => s.remove);
  useEffect(() => {
    for (const id of ids) remove(id);
  }, [ids, remove]);
  return (
    <p className="mt-4 text-xs text-[var(--color-text-secondary)]">
      {locale === "ar"
        ? `${ids.length} منتج اتشال من المتجر واتنظف من المفضلة.`
        : `${ids.length} item(s) were removed from the store and pruned from your wishlist.`}
    </p>
  );
}

function EmptyState({ locale }: { locale: Locale }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-bg)] text-[var(--color-accent-dark)]">
        <Heart className="h-6 w-6" />
      </div>
      <p className="font-display text-2xl">
        {locale === "ar"
          ? "ما فيش حاجة في المفضلة — ابدأ التسوق 👜"
          : "Your wishlist is empty — start shopping 👜"}
      </p>
      <Link
        href={`/${locale}/catalog`}
        className="mt-2 rounded-full bg-[var(--color-primary)] px-6 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-primary-light)]"
      >
        {locale === "ar" ? "تصفّح المنتجات" : "Browse products"}
      </Link>
    </div>
  );
}
