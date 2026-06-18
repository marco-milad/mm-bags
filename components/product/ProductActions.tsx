"use client";

import { useMemo, useState } from "react";
import { Check, MessageCircle, ShoppingBag } from "lucide-react";
import type { Locale } from "@/lib/i18n-config";
import type { ProductWithVariants } from "@/lib/catalog-shared";
import type { ProductVariant } from "@/lib/supabase/types";
import { cn, formatPriceEGP } from "@/lib/utils";
import { useCartStore } from "@/store/cart";
import { WishlistButton } from "./WishlistButton";
import { BackInStockForm } from "./BackInStockForm";
import { SizeGuideModal } from "@/components/size-guide/SizeGuideModal";
import { Ruler } from "lucide-react";

type Color = { hex: string; ar: string; en: string };

function pickInitialVariant(variants: ProductVariant[]): ProductVariant | null {
  if (variants.length === 0) return null;
  return variants.find((v) => (v.stock_qty ?? 0) > 0) ?? variants[0];
}

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

export function ProductActions({
  product,
  locale,
  whatsappNumber,
  onColorHover,
  compact = false,
}: {
  product: ProductWithVariants;
  locale: Locale;
  whatsappNumber: string;
  /** Notify the surrounding layout that the user is hovering / focusing a
      color swatch (hex value). `null` means the pointer has left — the
      layout should clear its preview-image override. Fired by both
      hover and keyboard focus to keep the image preview accessible. */
  onColorHover?: (hex: string | null) => void;
  /** Slug-scoped canary (bs-milano-classic): switch the color-swatch row
      from `flex-wrap` to a single horizontally-scrollable row to drop
      ~44 px of above-fold height on dense, multi-colour products.
      Size row is intentionally NOT compacted (small finite set, hiding
      behind a scroll affordance hurts conversion). All other products
      render byte-identically to today. */
  compact?: boolean;
}) {
  const variants = product.product_variants;
  const initial = pickInitialVariant(variants);
  const [selectedColor, setSelectedColor] = useState<string | null>(
    initial?.color_hex ?? null,
  );
  const [selectedSize, setSelectedSize] = useState<number | null>(
    initial?.size_inches ?? null,
  );
  // Progressive disclosure for dense colour rails. Gated behind
  // `compact` (currently slug-scoped to bs-milano-classic) AND a hard
  // count threshold so products with ≤ 6 colours show every swatch
  // up front. Once expanded, every swatch wraps into the row as
  // normal and the disclosure button disappears.
  const [colorsExpanded, setColorsExpanded] = useState(false);
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
  const price = variantPrice(selectedVariant, product.base_price, product.sale_price);
  const hasSale =
    product.sale_price !== null && product.sale_price < product.base_price;
  const savings =
    hasSale && product.sale_price !== null
      ? Math.round(((product.base_price - product.sale_price) / product.base_price) * 100)
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
  };

  const productName = locale === "ar" ? product.name_ar : product.name_en;
  const colorLabel = (c: Color) => (locale === "ar" ? c.ar : c.en);

  const whatsappHref = (() => {
    const num = whatsappNumber.replace(/[^\d]/g, "");
    const msg =
      locale === "ar"
        ? `أهلاً ماركو، عايز أسأل عن ${productName} على M.M Bags.`
        : `Hi Marco, I'd like to ask about ${productName} on M.M Bags.`;
    return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
  })();

  // Installment: 6 monthly payments, rounded up to nearest 10 EGP for display.
  const monthly = Math.ceil(price / 6 / 10) * 10;

  return (
    <div className="flex flex-col gap-5">
      {/* Price */}
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="font-mono text-3xl font-semibold text-[var(--color-primary)]">
          {formatPriceEGP(price, locale)}
        </span>
        {hasSale && (
          <>
            <span className="font-mono text-base text-[var(--color-text-secondary)] line-through">
              {formatPriceEGP(product.base_price, locale)}
            </span>
            <span className="rounded-full bg-[var(--color-accent)] px-2 py-0.5 font-mono text-[11px] font-semibold text-[var(--color-primary)]">
              -{savings}%
            </span>
          </>
        )}
      </div>

      <p className="rounded-lg bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text-secondary)]">
        {locale === "ar"
          ? `أو قسّطها على 6 شهور ≈ ${formatPriceEGP(monthly, locale)} / شهر`
          : `Or pay in 6 monthly installments ≈ ${formatPriceEGP(monthly, locale)} / mo`}
      </p>

      {/* Color picker */}
      {colors.length > 0 && (() => {
        // Show first 6 swatches + "+N more" link when the rail is
        // crowded; threshold of >6 means a row with exactly 6 colours
        // shows them all rather than 6 + "+0". Replaces the
        // horizontal-scroll pattern from the previous compact canary
        // — progressive disclosure beats a hidden scroll affordance
        // on touch.
        const COLORS_INITIAL = 6;
        const COLORS_DISCLOSURE_THRESHOLD = 6;
        const showColorDisclosure =
          compact &&
          colors.length > COLORS_DISCLOSURE_THRESHOLD &&
          !colorsExpanded;
        const visibleColors = showColorDisclosure
          ? colors.slice(0, COLORS_INITIAL)
          : colors;
        const hiddenColorCount = colors.length - COLORS_INITIAL;
        return (
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
            {locale === "ar" ? "اللون" : "Color"}
            {selectedColor && (
              <span className="ml-2 normal-case text-[var(--color-text)]">
                · {colorLabel(colors.find((c) => c.hex === selectedColor)!)}
              </span>
            )}
          </p>
          <div
            className={cn(
              "flex flex-wrap items-center gap-2",
              compact && "py-1",
            )}
          >
            {visibleColors.map((c) => {
              const stockedForColor = variantHasStock(
                (v) =>
                  v.color_hex === c.hex &&
                  (sizes.length === 0 || v.size_inches === selectedSize),
              );
              const isActive = c.hex === selectedColor;
              return (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => {
                    setSelectedColor(c.hex);
                    // Mobile tap: phones don't fire pointer-leave/blur
                    // reliably after a tap, so we keep the previewed image
                    // pinned to the just-selected color until the next
                    // tap on another swatch. Selecting the color is the
                    // intent, so this matches expectations.
                    onColorHover?.(c.hex);
                  }}
                  onMouseEnter={() => onColorHover?.(c.hex)}
                  onMouseLeave={() => onColorHover?.(null)}
                  onFocus={() => onColorHover?.(c.hex)}
                  onBlur={() => onColorHover?.(null)}
                  aria-label={colorLabel(c)}
                  aria-pressed={isActive ? "true" : "false"}
                  className={cn(
                    "relative h-11 w-11 rounded-full ring-offset-2 ring-offset-[var(--color-bg)] transition",
                    isActive
                      ? "ring-2 ring-[var(--color-primary)]"
                      : "ring-1 ring-[var(--color-border)] hover:ring-[var(--color-accent)]",
                    !stockedForColor && "opacity-40",
                  )}
                  style={{ background: c.hex }}
                >
                  {!stockedForColor && (
                    <span className="absolute inset-0 m-auto block h-px w-8 rotate-45 bg-white/70" />
                  )}
                </button>
              );
            })}
            {showColorDisclosure && (
              <button
                type="button"
                onClick={() => setColorsExpanded(true)}
                className="inline-flex h-11 items-center rounded-full border border-[var(--color-border)] px-3 text-xs font-semibold text-[var(--color-accent-dark)] transition hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)]/10"
              >
                {locale === "ar"
                  ? `+${hiddenColorCount} لون آخر`
                  : `+${hiddenColorCount} more`}
              </button>
            )}
          </div>
        </div>
        );
      })()}

      {/* Size picker */}
      {sizes.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
              {locale === "ar" ? "المقاس" : "Size"}
            </p>
            <SizeGuideModal locale={locale}>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-primary)] underline-offset-4 hover:underline"
              >
                <Ruler className="h-3.5 w-3.5" />
                {locale === "ar" ? "دليل المقاسات" : "Size guide"}
              </button>
            </SizeGuideModal>
          </div>
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
                    "inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border px-4 py-2 text-sm font-mono transition",
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
            {locale === "ar" ? "غير متوفر حالياً" : "Out of stock"}
          </p>
        ) : isLow ? (
          <p className="text-sm font-medium text-[var(--color-warning)]">
            {locale === "ar" ? `باقي ${stock} قطع فقط!` : `Only ${stock} left!`}
          </p>
        ) : (
          <p className="text-sm text-[var(--color-success)]">
            {locale === "ar" ? "متوفر" : "In stock"}
          </p>
        )}
      </div>

      {/* CTA */}
      {isOOS ? (
        selectedVariant && (
          <BackInStockForm
            key={selectedVariant.id}
            productId={product.id}
            variantId={selectedVariant.id}
            locale={locale}
          />
        )
      ) : (
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-light)]"
        >
          <ShoppingBag className="h-4 w-4" />
          {locale === "ar" ? "أضف للكارت" : "Add to cart"}
        </button>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <WishlistButton
          locale={locale}
          variant="button"
          product={{
            productId: product.id,
            productSlug: product.slug,
            name_ar: product.name_ar,
            name_en: product.name_en,
            image: product.images?.[0] ?? null,
          }}
        />
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-full border border-[var(--color-border)] px-6 py-3 text-sm font-medium text-[var(--color-text)] transition hover:border-[var(--color-accent)]"
        >
          <MessageCircle className="h-4 w-4" />
          {locale === "ar" ? "اسأل عن المنتج" : "Ask about this product"}
        </a>
      </div>

      {/* Trust badges */}
      <ul className="grid grid-cols-2 gap-3 border-t border-[var(--color-border)] pt-5 text-xs text-[var(--color-text-secondary)] md:grid-cols-4">
        {(locale === "ar"
          ? ["شحن سريع", "إرجاع خلال 14 يوم", "دفع آمن", "الدفع عند الاستلام"]
          : ["Fast shipping", "14-day returns", "Secure payment", "Cash on delivery"]
        ).map((label) => (
          <li
            key={label}
            className="flex min-w-0 items-center gap-2 rounded-md bg-[var(--color-surface)] px-3 py-2"
          >
            <Check className="h-3.5 w-3.5 shrink-0 text-[var(--color-success)]" />
            <span className="min-w-0 leading-tight">{label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
