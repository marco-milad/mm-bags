"use client";

import { useMemo, useState } from "react";
import { Bell, Check, MessageCircle, ShoppingBag } from "lucide-react";
import type { Locale } from "@/lib/i18n-config";
import type { ProductWithVariants } from "@/lib/catalog-shared";
import type { ProductVariant } from "@/lib/supabase/types";
import { cn, formatPriceEGP } from "@/lib/utils";

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
}: {
  product: ProductWithVariants;
  locale: Locale;
  whatsappNumber: string;
}) {
  const variants = product.product_variants;
  const initial = pickInitialVariant(variants);
  const [selectedColor, setSelectedColor] = useState<string | null>(
    initial?.color_hex ?? null,
  );
  const [selectedSize, setSelectedSize] = useState<number | null>(
    initial?.size_inches ?? null,
  );
  const [added, setAdded] = useState(false);
  const [notifyRequested, setNotifyRequested] = useState(false);

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
    // Phase 2 step 3 wires this to Zustand + drawer. For now, brief success state.
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  const onNotify = () => {
    // Phase 3 will POST to /api/notifications with email/phone.
    setNotifyRequested(true);
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
      {colors.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
            {locale === "ar" ? "اللون" : "Color"}
            {selectedColor && (
              <span className="ml-2 normal-case text-[var(--color-text)]">
                · {colorLabel(colors.find((c) => c.hex === selectedColor)!)}
              </span>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            {colors.map((c) => {
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
                  onClick={() => setSelectedColor(c.hex)}
                  aria-label={colorLabel(c)}
                  aria-pressed={isActive}
                  className={cn(
                    "relative h-10 w-10 rounded-full ring-offset-2 ring-offset-[var(--color-bg)] transition",
                    isActive
                      ? "ring-2 ring-[var(--color-primary)]"
                      : "ring-1 ring-[var(--color-border)] hover:ring-[var(--color-accent)]",
                    !stockedForColor && "opacity-40",
                  )}
                  style={{ background: c.hex }}
                >
                  {!stockedForColor && (
                    <span className="absolute inset-0 m-auto block h-px w-7 rotate-45 bg-white/70" />
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
            {locale === "ar" ? "المقاس" : "Size"}
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
                  aria-pressed={isActive}
                  className={cn(
                    "rounded-lg border px-4 py-2 text-sm font-mono transition",
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
        <button
          type="button"
          onClick={onNotify}
          disabled={notifyRequested}
          className="flex items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-light)] disabled:opacity-70"
        >
          {notifyRequested ? (
            <>
              <Check className="h-4 w-4" />
              {locale === "ar"
                ? "هنبعتلك إشعار لما يرجع"
                : "We'll notify you when it's back"}
            </>
          ) : (
            <>
              <Bell className="h-4 w-4" />
              {locale === "ar" ? "نبّهني لما يرجع" : "Notify me when back"}
            </>
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={onAdd}
          className={cn(
            "flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold transition",
            added
              ? "bg-[var(--color-success)] text-white"
              : "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-light)]",
          )}
        >
          {added ? (
            <>
              <Check className="h-4 w-4" />
              {locale === "ar" ? "تمت الإضافة للكارت" : "Added to cart"}
            </>
          ) : (
            <>
              <ShoppingBag className="h-4 w-4" />
              {locale === "ar" ? "أضف للكارت" : "Add to cart"}
            </>
          )}
        </button>
      )}

      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 rounded-full border border-[var(--color-border)] px-6 py-3 text-sm font-medium text-[var(--color-text)] transition hover:border-[var(--color-accent)]"
      >
        <MessageCircle className="h-4 w-4" />
        {locale === "ar" ? "اسأل عن المنتج" : "Ask about this product"}
      </a>

      {/* Trust badges */}
      <ul className="grid grid-cols-2 gap-3 border-t border-[var(--color-border)] pt-5 text-xs text-[var(--color-text-secondary)] md:grid-cols-4">
        {(locale === "ar"
          ? ["شحن سريع", "إرجاع خلال 14 يوم", "دفع آمن", "الدفع عند الاستلام"]
          : ["Fast shipping", "14-day returns", "Secure payment", "Cash on delivery"]
        ).map((label) => (
          <li
            key={label}
            className="flex items-center gap-2 rounded-md bg-[var(--color-surface)] px-3 py-2"
          >
            <Check className="h-3.5 w-3.5 text-[var(--color-success)]" />
            <span>{label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
