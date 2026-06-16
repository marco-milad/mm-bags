"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import type { Locale } from "@/lib/i18n-config";
import { formatPriceEGP } from "@/lib/utils";
import {
  useCartHydrated,
  useCartItems,
  useCartItemCount,
  useCartTotal,
} from "@/store/cart";
import { CartItem } from "./CartItem";

const FREE_SHIPPING_THRESHOLD = 1500;

/**
 * Full-page cart view. Mirrors what CartDrawer renders but as a
 * dedicated page so direct links to /{locale}/cart work and so
 * users on mobile have a fuller layout to manage quantities.
 *
 * Reads the same Zustand store the drawer reads, so adding from a
 * PDP and then refreshing /cart "just works". Until the store
 * hydrates from localStorage we render a skeleton — otherwise the
 * SSR pass would show an empty cart that flickers on hydration.
 */
export function CartPageContent({ locale }: { locale: Locale }) {
  const isRTL = locale === "ar";
  const hydrated = useCartHydrated();
  const items = useCartItems();
  const count = useCartItemCount();
  const subtotal = useCartTotal();

  if (!hydrated) {
    return (
      <p className="rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-10 text-center text-xs text-[var(--color-text-secondary)]">
        {isRTL ? "جاري التحميل..." : "Loading..."}
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-10 text-center">
        <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-text)] text-[var(--color-bg)]">
          <ShoppingBag className="h-6 w-6" />
        </div>
        <h2 className="font-display text-2xl text-[var(--color-text)]">
          {isRTL ? "السلة فاضية" : "Your cart is empty"}
        </h2>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          {isRTL
            ? "ضيف منتجاتك المفضلة قبل ما تخلص."
            : "Add a few favourites before checkout."}
        </p>
        <Link
          href={`/${locale}/catalog`}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-primary)]/90"
        >
          {isRTL ? "ابدأ التسوق" : "Browse the catalog"}
        </Link>
      </div>
    );
  }

  const shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : 50;
  const total = subtotal + shippingFee;
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <ul className="space-y-3">
        {items.map((item) => (
          <li
            key={item.variantId}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
          >
            <CartItem item={item} locale={locale} />
          </li>
        ))}
      </ul>

      <aside className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 lg:sticky lg:top-24 lg:self-start">
        <h2 className="font-display text-xl text-[var(--color-text)]">
          {isRTL ? "ملخص الطلب" : "Order summary"}
        </h2>
        <dl className="mt-4 space-y-2 text-sm">
          <Row
            label={isRTL ? `الإجمالي (${count} منتج)` : `Subtotal (${count} items)`}
            value={formatPriceEGP(subtotal, locale)}
          />
          <Row
            label={isRTL ? "الشحن" : "Shipping"}
            value={
              shippingFee === 0
                ? isRTL
                  ? "مجاني"
                  : "Free"
                : formatPriceEGP(shippingFee, locale)
            }
          />
          {remaining > 0 && (
            <p className="rounded-md bg-[var(--color-accent)]/10 px-3 py-2 text-[11px] text-[var(--color-accent-dark)]">
              {isRTL
                ? `ضيف ${formatPriceEGP(remaining, locale)} كمان للشحن المجاني`
                : `Add ${formatPriceEGP(remaining, locale)} more for free shipping`}
            </p>
          )}
          <div className="border-t border-dashed border-[var(--color-border)] pt-2">
            <Row
              label={isRTL ? "الإجمالي" : "Total"}
              value={formatPriceEGP(total, locale)}
              strong
            />
          </div>
        </dl>

        <Link
          href={`/${locale}/checkout`}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-primary)]/90"
        >
          {isRTL ? "إتمام الشراء" : "Checkout"}
        </Link>
        <Link
          href={`/${locale}/catalog`}
          className="mt-2 block text-center text-xs text-[var(--color-text-secondary)] underline-offset-4 hover:underline"
        >
          {isRTL ? "كمل تسوّق" : "Continue shopping"}
        </Link>
      </aside>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-[var(--color-text-secondary)]">{label}</dt>
      <dd
        className={
          strong
            ? "font-mono text-lg font-semibold text-[var(--color-primary)]"
            : "font-mono text-sm text-[var(--color-text)]"
        }
      >
        {value}
      </dd>
    </div>
  );
}
