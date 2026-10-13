"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import type { Locale } from "@/lib/i18n-config";
import { formatPriceEGP } from "@/lib/utils";
import { qtyCap } from "@/lib/cart/qty";
import { useCartStore, type CartItem as CartItemType } from "@/store/cart";

export function CartItem({
  item,
  locale,
}: {
  item: CartItemType;
  locale: Locale;
}) {
  const updateQty = useCartStore((s) => s.updateQty);
  const removeItem = useCartStore((s) => s.removeItem);
  const closeDrawer = useCartStore((s) => s.closeDrawer);

  const name = locale === "ar" ? item.name_ar : item.name_en;
  const colorLabel =
    locale === "ar" ? item.color_ar ?? null : item.color_en ?? null;
  const sizeLabel = item.size_inches ? `${item.size_inches}"` : null;
  const lineTotal = item.unitPrice * item.qty;
  // Stock is optional (old persisted lines) — unknown stock shows no note
  // and only the absolute MAX_QTY caps "+".
  const atCap = item.qty >= qtyCap(item.stock);
  const isOOS = item.stock === 0;
  const isLow = item.stock != null && item.stock > 0 && item.stock <= 5;

  return (
    <li className="flex gap-3 border-b border-[var(--color-border)] py-4">
      <Link
        href={`/${locale}/products/${item.productSlug}`}
        onClick={closeDrawer}
        className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-[var(--color-surface-2)]"
      >
        {item.image ? (
          <Image
            src={item.image}
            alt={name}
            fill
            sizes="80px"
            className="object-cover"
          />
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col gap-1.5">
        <Link
          href={`/${locale}/products/${item.productSlug}`}
          onClick={closeDrawer}
          className="line-clamp-2 text-sm font-medium text-[var(--color-text)] hover:text-[var(--color-primary)]"
        >
          {name}
        </Link>

        {(colorLabel || sizeLabel) && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-secondary)]">
            {colorLabel && item.color_hex && (
              <span className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="inline-block h-3 w-3 rounded-full ring-1 ring-[var(--color-border)]"
                  style={{ background: item.color_hex }}
                />
                {colorLabel}
              </span>
            )}
            {sizeLabel && (
              <span className="font-mono">
                {locale === "ar" ? "مقاس" : "Size"} {sizeLabel}
              </span>
            )}
          </div>
        )}

        {isOOS ? (
          <p className="text-xs font-medium text-[var(--color-error)]">
            {locale === "ar"
              ? "خلص من المخزون — شيله عشان تكمل الطلب"
              : "Out of stock — remove it to check out"}
          </p>
        ) : isLow ? (
          <p className="text-xs font-medium text-[var(--color-warning)]">
            {locale === "ar"
              ? `فاضل ${item.stock} بس`
              : `Only ${item.stock} left`}
          </p>
        ) : null}

        {/* 44px steppers (M9). flex-wrap lets the line total drop under the
            stepper on the narrowest phones instead of squeezing it. */}
        <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <div className="inline-flex items-center rounded-full border border-[var(--color-border)]">
            <button
              type="button"
              aria-label={locale === "ar" ? "نقصان" : "Decrease"}
              onClick={() => updateQty(item.variantId, item.qty - 1)}
              disabled={item.qty <= 1}
              className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--color-text)] transition hover:bg-[var(--color-surface)] disabled:opacity-30"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span
              aria-live="polite"
              className="min-w-6 text-center font-mono text-sm text-[var(--color-text)]"
            >
              {item.qty}
            </span>
            <button
              type="button"
              aria-label={locale === "ar" ? "زيادة" : "Increase"}
              onClick={() => updateQty(item.variantId, item.qty + 1)}
              disabled={atCap}
              className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--color-text)] transition hover:bg-[var(--color-surface)] disabled:opacity-30"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <span className="font-mono text-sm font-semibold text-[var(--color-primary)]">
            {formatPriceEGP(lineTotal, locale)}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => removeItem(item.variantId)}
        aria-label={locale === "ar" ? "إزالة من السلة" : "Remove from cart"}
        className="-me-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center self-start rounded-full text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface)] hover:text-[var(--color-error)]"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}
