"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import type { Locale } from "@/lib/i18n-config";
import { formatPriceEGP } from "@/lib/utils";
import { qtyCapReason } from "@/lib/cart/qty";
import { pickLocalized } from "@/lib/i18n/pick";
import { useCartStore, type CartItem as CartItemType } from "@/store/cart";

export function CartItem({
  item,
  locale,
  as: Tag = "li",
}: {
  item: CartItemType;
  locale: Locale;
  /** "div" when the caller already wraps each line in its own <li>. */
  as?: "li" | "div";
}) {
  const updateQty = useCartStore((s) => s.updateQty);
  const removeItem = useCartStore((s) => s.removeItem);
  const closeDrawer = useCartStore((s) => s.closeDrawer);

  const isAr = locale === "ar";
  const name = isAr ? item.name_ar : item.name_en;
  const colorLabel = pickLocalized(item.color_ar, item.color_en, isAr) || null;
  const sizeLabel = item.size_inches ? `${item.size_inches}"` : null;
  const lineTotal = item.unitPrice * item.qty;
  // Stock is optional (old persisted lines) — unknown stock shows no stock
  // note and only the absolute MAX_QTY caps "+".
  const capReason = qtyCapReason(item.qty, item.stock);
  const isLow = item.stock != null && item.stock > 0 && item.stock <= 5;

  // One line under the variant explaining the stock situation. At the cap it
  // doubles as the reason "+" is disabled, so it's also in "+"'s label.
  const capNote =
    capReason === "sold_out"
      ? isAr
        ? "خلص من المخزون — شيله عشان تكمل الطلب"
        : "Out of stock — remove it to check out"
      : capReason === "stock"
        ? isAr
          ? "ده كل اللي عندنا"
          : "That's all we have"
        : capReason === "max"
          ? isAr
            ? "دي أقصى كمية للطلب الواحد"
            : "That's the most per order"
          : null;
  const increaseLabel = isAr ? "زيادة" : "Increase";

  return (
    <Tag className="flex gap-3 border-b border-[var(--color-border)] py-4">
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

        {capNote ? (
          <p
            className={
              capReason === "sold_out"
                ? "text-xs font-medium text-[var(--color-error)]"
                : "text-xs font-medium text-[var(--color-warning)]"
            }
          >
            {capNote}
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
            {/* aria-disabled (not disabled) keeps "+" focusable at the cap so
                screen readers can still reach it and hear why. */}
            <button
              type="button"
              aria-label={capNote ? `${increaseLabel} — ${capNote}` : increaseLabel}
              aria-disabled={capReason ? true : undefined}
              onClick={() => {
                if (capReason) return;
                updateQty(item.variantId, item.qty + 1);
              }}
              className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--color-text)] transition hover:bg-[var(--color-surface)] aria-disabled:cursor-not-allowed aria-disabled:opacity-30 aria-disabled:hover:bg-transparent"
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
    </Tag>
  );
}
