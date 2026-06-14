"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ShoppingBag } from "lucide-react";
import { useMemo, useState } from "react";
import type { Locale } from "@/lib/i18n-config";
import type { ProductWithVariants } from "@/lib/catalog-shared";
import type { ProductVariant } from "@/lib/supabase/types";
import { cn, formatPriceEGP } from "@/lib/utils";
import { useCartStore } from "@/store/cart";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProductSpecsChips } from "@/components/product/ProductSpecs";

type Color = { hex: string; ar: string; en: string };

/** First in-stock variant, falling back to the first variant overall. */
function pickInitialVariant(variants: ProductVariant[]): ProductVariant | null {
  if (variants.length === 0) return null;
  return variants.find((v) => (v.stock_qty ?? 0) > 0) ?? variants[0];
}

/** Variant price honors a per-variant override, then sale, then base. */
function variantPrice(
  variant: ProductVariant | null,
  base: number,
  sale: number | null,
): number {
  if (variant?.price_override !== null && variant?.price_override !== undefined) {
    return variant.price_override;
  }
  return sale ?? base;
}

/**
 * Quick View modal body. Mounted by `QuickViewTrigger` after a dynamic
 * import — the catalog page never pays the cost of this code until a
 * customer actually clicks Quick View on a card.
 *
 * Mirrors the PDP's ProductActions selection logic (color, size, stock,
 * add-to-cart) so the two stay behaviorally consistent, but trimmed to
 * what fits in a modal — no installment line, no trust badges, no
 * WhatsApp CTA (the floating FAB already covers that contact path).
 */
export function QuickViewModal({
  product,
  locale,
  open,
  onOpenChange,
}: {
  product: ProductWithVariants;
  locale: Locale;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isRTL = locale === "ar";
  const variants = product.product_variants;
  const initial = pickInitialVariant(variants);

  const [selectedColor, setSelectedColor] = useState<string | null>(
    initial?.color_hex ?? null,
  );
  const [selectedSize, setSelectedSize] = useState<number | null>(
    initial?.size_inches ?? null,
  );
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  const addItem = useCartStore((s) => s.addItem);
  const openDrawer = useCartStore((s) => s.openDrawer);

  const colors: Color[] = useMemo(() => {
    const map = new Map<string, Color>();
    for (const v of variants) {
      if (!v.color_hex) continue;
      if (!map.has(v.color_hex)) {
        map.set(v.color_hex, {
          hex: v.color_hex,
          ar: v.color_ar ?? "",
          en: v.color_en ?? "",
        });
      }
    }
    return [...map.values()];
  }, [variants]);

  const sizes: number[] = useMemo(() => {
    const set = new Set<number>();
    for (const v of variants) {
      if (typeof v.size_inches === "number") set.add(v.size_inches);
    }
    return [...set].sort((a, b) => a - b);
  }, [variants]);

  const selectedVariant = useMemo(() => {
    return (
      variants.find(
        (v) =>
          v.color_hex === selectedColor &&
          (sizes.length === 0 || v.size_inches === selectedSize),
      ) ?? null
    );
  }, [variants, selectedColor, selectedSize, sizes.length]);

  const stock = selectedVariant?.stock_qty ?? 0;
  const isOOS = !selectedVariant || stock === 0;
  const isLow = !isOOS && stock <= 5;
  const price = variantPrice(
    selectedVariant,
    product.base_price,
    product.sale_price,
  );
  const hasSale =
    product.sale_price !== null && product.sale_price < product.base_price;
  const savings =
    hasSale && product.sale_price !== null
      ? Math.round(
          ((product.base_price - product.sale_price) / product.base_price) *
            100,
        )
      : 0;

  const variantHasStock = (predicate: (v: ProductVariant) => boolean) =>
    variants.some((v) => predicate(v) && (v.stock_qty ?? 0) > 0);

  const onAdd = () => {
    if (!selectedVariant || isOOS) return;
    addItem({
      variantId: selectedVariant.id,
      productId: product.id,
      productSlug: product.slug,
      name_ar: product.name_ar,
      name_en: product.name_en,
      image: product.images?.[0] ?? null,
      color_hex: selectedVariant.color_hex,
      color_ar: selectedVariant.color_ar,
      color_en: selectedVariant.color_en,
      size_inches: selectedVariant.size_inches,
      unitPrice: price,
    });
    openDrawer();
    onOpenChange(false);
  };

  const images = product.images ?? [];
  const mainImage = images[activeImageIdx] ?? images[0] ?? null;
  const Forward = isRTL ? ArrowLeft : ArrowRight;
  const colorLabel = (c: Color) => (isRTL ? c.ar : c.en);
  const selectedColorObj = colors.find((c) => c.hex === selectedColor);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl md:w-[90vw] md:max-w-4xl"
        closeAriaLabel={isRTL ? "إغلاق" : "Close"}
      >
        {/* Accessible labels — visually hidden, announced to screen readers. */}
        <DialogTitle className="sr-only">
          {isRTL ? product.name_ar : product.name_en}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {isRTL ? "عرض سريع للمنتج" : "Quick view for the product"}
        </DialogDescription>

        <div className="grid max-h-[88vh] grid-cols-1 overflow-y-auto md:max-h-none md:grid-cols-[1.05fr_1fr] md:overflow-hidden">
          {/* ── Gallery ─────────────────────────────────────────────── */}
          <div className="flex flex-col gap-3 bg-[var(--color-surface)] p-4 md:max-h-[88vh] md:overflow-hidden">
            <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-[var(--color-surface-2)]">
              {mainImage ? (
                <Image
                  src={mainImage}
                  alt={isRTL ? product.name_ar : product.name_en}
                  fill
                  sizes="(min-width: 768px) 420px, 92vw"
                  className="object-cover"
                  priority={false}
                />
              ) : (
                <div className="grid h-full place-items-center text-xs text-[var(--color-text-secondary)]">
                  {isRTL ? "بدون صورة" : "No image"}
                </div>
              )}
              {hasSale && !isOOS && (
                <span className="absolute top-3 z-10 rounded-full bg-[var(--color-accent)] px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-[var(--color-primary)] ltr:left-3 rtl:right-3">
                  -{savings}%
                </span>
              )}
            </div>

            {/* Thumbnails — horizontal scroll. Hidden when there's only one
                image so we don't show a useless single-thumb row. */}
            {images.length > 1 && (
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                {images.map((src, idx) => {
                  const isActive = idx === activeImageIdx;
                  return (
                    <button
                      key={`${src}-${idx}`}
                      type="button"
                      onClick={() => setActiveImageIdx(idx)}
                      aria-label={
                        isRTL ? `صورة ${idx + 1}` : `Image ${idx + 1}`
                      }
                      aria-pressed={isActive}
                      className={cn(
                        "relative h-16 w-16 shrink-0 overflow-hidden rounded-md transition",
                        isActive
                          ? "ring-2 ring-[var(--color-primary)] ring-offset-2 ring-offset-[var(--color-surface)]"
                          : "opacity-70 ring-1 ring-[var(--color-border)] hover:opacity-100",
                      )}
                    >
                      <Image
                        src={src}
                        alt=""
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Details ─────────────────────────────────────────────── */}
          <div className="flex flex-col gap-4 overflow-y-auto p-6 md:max-h-[88vh]">
            {/* Both languages always visible — the user spec calls this
                out explicitly, and the secondary language helps customers
                searching the bilingual catalog confirm they're looking at
                the right product. */}
            <div>
              <h2 className="font-serif text-2xl text-[var(--color-text)]">
                {isRTL ? product.name_ar : product.name_en}
              </h2>
              <p
                dir={isRTL ? "ltr" : "rtl"}
                className="mt-1 text-sm text-[var(--color-text-secondary)]"
              >
                {isRTL ? product.name_en : product.name_ar}
              </p>
            </div>

            {/* Price */}
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="font-mono text-2xl font-semibold text-[var(--color-primary)]">
                {formatPriceEGP(price, locale)}
              </span>
              {hasSale && (
                <span className="font-mono text-sm text-[var(--color-text-secondary)] line-through">
                  {formatPriceEGP(product.base_price, locale)}
                </span>
              )}
            </div>

            {/* Color picker */}
            {colors.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
                  {isRTL ? "اللون" : "Color"}
                  {selectedColorObj && (
                    <span className="ml-2 normal-case text-[var(--color-text)]">
                      · {colorLabel(selectedColorObj)}
                    </span>
                  )}
                </p>
                <div className="flex flex-wrap gap-2">
                  {colors.map((c) => {
                    const stockedForColor = variantHasStock(
                      (v) =>
                        v.color_hex === c.hex &&
                        (sizes.length === 0 ||
                          v.size_inches === selectedSize),
                    );
                    const isActive = c.hex === selectedColor;
                    return (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setSelectedColor(c.hex)}
                        aria-label={colorLabel(c)}
                        aria-pressed={isActive ? "true" : "false"}
                        className={cn(
                          "relative h-9 w-9 rounded-full ring-offset-2 ring-offset-[var(--color-bg)] transition",
                          isActive
                            ? "ring-2 ring-[var(--color-primary)]"
                            : "ring-1 ring-[var(--color-border)] hover:ring-[var(--color-accent)]",
                          !stockedForColor && "opacity-40",
                        )}
                        style={{ background: c.hex }}
                      >
                        {!stockedForColor && (
                          <span className="absolute inset-0 m-auto block h-px w-6 rotate-45 bg-white/70" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Size picker */}
            {sizes.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
                  {isRTL ? "المقاس" : "Size"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((s) => {
                    const stockedForSize = variantHasStock(
                      (v) =>
                        v.size_inches === s &&
                        (selectedColor ? v.color_hex === selectedColor : true),
                    );
                    const isActive = s === selectedSize;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSelectedSize(s)}
                        aria-pressed={isActive ? "true" : "false"}
                        className={cn(
                          "rounded-lg border px-3.5 py-1.5 font-mono text-sm transition",
                          isActive
                            ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                            : "border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-accent)]",
                          !stockedForSize && "line-through opacity-40",
                        )}
                      >
                        {s}&quot;
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Stock status */}
            <div aria-live="polite" className="min-h-5">
              {isOOS ? (
                <p className="text-sm font-medium text-[var(--color-error)]">
                  {isRTL ? "غير متوفر حالياً" : "Out of stock"}
                </p>
              ) : isLow ? (
                <p className="text-sm font-medium text-[var(--color-warning)]">
                  {isRTL ? `باقي ${stock} قطع فقط!` : `Only ${stock} left!`}
                </p>
              ) : (
                <p className="text-sm text-[var(--color-success)]">
                  {isRTL ? "متوفر" : "In stock"}
                </p>
              )}
            </div>

            {/* Specs chips */}
            <ProductSpecsChips product={product} locale={locale} max={6} />

            {/* CTAs — pushed to the bottom on tall variants via mt-auto.
                When stock is gone we hide the disabled cart button and
                show only the link to the PDP (where the back-in-stock
                form lives — keeping it here would duplicate that form
                across two places). */}
            <div className="mt-auto flex flex-col gap-2 pt-2">
              {!isOOS && (
                <button
                  type="button"
                  onClick={onAdd}
                  className="flex items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-light)]"
                >
                  <ShoppingBag className="h-4 w-4" />
                  {isRTL ? "أضف للكارت" : "Add to cart"}
                </button>
              )}
              <Link
                href={`/${locale}/products/${product.slug}`}
                onClick={() => onOpenChange(false)}
                className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[var(--color-border)] px-6 py-3 text-sm font-medium text-[var(--color-text)] transition hover:border-[var(--color-accent)]"
              >
                {isRTL ? "عرض المنتج كاملاً" : "View full product"}
                <Forward className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
