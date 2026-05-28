"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import type { Locale } from "@/lib/i18n-config";
import { formatPriceEGP } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  useCartIsOpen,
  useCartItems,
  useCartItemCount,
  useCartTotal,
  useCartStore,
} from "@/store/cart";
import { CartItem } from "./CartItem";

const FREE_SHIPPING_THRESHOLD = 1500;

export function CartDrawer({ locale }: { locale: Locale }) {
  const isOpen = useCartIsOpen();
  const setOpen = useCartStore((s) => s.setOpen);
  const items = useCartItems();
  const itemCount = useCartItemCount();
  const subtotal = useCartTotal();

  // In RTL the cart icon sits on the LEFT of the navbar, so the drawer
  // slides in from the left. LTR is mirrored.
  const side = locale === "ar" ? "left" : "right";
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent
        side={side}
        closeAriaLabel={locale === "ar" ? "إغلاق" : "Close"}
      >
        <header className="border-b border-[var(--color-border)] px-5 py-4">
          <SheetTitle className="font-display text-xl text-[var(--color-primary)]">
            {locale === "ar" ? "السلة" : "Cart"}
            {itemCount > 0 && (
              <span className="ml-2 font-mono text-sm font-normal text-[var(--color-text-secondary)]">
                · {itemCount}
              </span>
            )}
          </SheetTitle>
          <SheetDescription className="sr-only">
            {locale === "ar"
              ? "المنتجات اللي اخترتها"
              : "Items you've added to your cart"}
          </SheetDescription>
        </header>

        {items.length === 0 ? (
          <EmptyCart locale={locale} />
        ) : (
          <>
            <ul className="flex-1 overflow-y-auto px-5">
              {items.map((item) => (
                <CartItem key={item.variantId} item={item} locale={locale} />
              ))}
            </ul>

            <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
              {remaining > 0 && (
                <p className="mb-3 rounded-lg bg-[var(--color-bg)] px-3 py-2 text-xs text-[var(--color-text-secondary)]">
                  {locale === "ar"
                    ? `ضيف ${formatPriceEGP(remaining, locale)} كمان عشان الشحن يبقى مجاناً 🚚`
                    : `Add ${formatPriceEGP(remaining, locale)} more for free shipping 🚚`}
                </p>
              )}

              <dl className="mb-4 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-[var(--color-text-secondary)]">
                    {locale === "ar" ? "الإجمالي الفرعي" : "Subtotal"}
                  </dt>
                  <dd className="font-mono font-semibold text-[var(--color-text)]">
                    {formatPriceEGP(subtotal, locale)}
                  </dd>
                </div>
                <p className="text-[11px] text-[var(--color-text-secondary)]">
                  {locale === "ar"
                    ? "الشحن والضرائب تتحسب عند الدفع."
                    : "Shipping and taxes calculated at checkout."}
                </p>
              </dl>

              <Link
                href={`/${locale}/checkout`}
                onClick={() => setOpen(false)}
                className="flex w-full items-center justify-center rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-light)]"
              >
                {locale === "ar" ? "إكمال الشراء" : "Checkout"}
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-2 w-full rounded-full px-6 py-2 text-xs text-[var(--color-text-secondary)] transition hover:text-[var(--color-text)]"
              >
                {locale === "ar" ? "مواصلة التسوق" : "Continue shopping"}
              </button>
            </footer>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function EmptyCart({ locale }: { locale: Locale }) {
  const setOpen = useCartStore((s) => s.setOpen);
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-surface)] text-[var(--color-text-secondary)]">
        <ShoppingBag className="h-7 w-7" />
      </div>
      <p className="font-display text-xl text-[var(--color-text)]">
        {locale === "ar" ? "سلتك فاضية — ابدأ التسوق" : "Your cart is empty"}
      </p>
      <p className="text-sm text-[var(--color-text-secondary)]">
        {locale === "ar"
          ? "اختار من تشكيلاتنا وابدأ شنط سفرك."
          : "Pick something from our collections and start your trip."}
      </p>
      <Link
        href={`/${locale}/catalog`}
        onClick={() => setOpen(false)}
        className="mt-2 rounded-full bg-[var(--color-primary)] px-6 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-primary-light)]"
      >
        {locale === "ar" ? "تصفّح المنتجات" : "Browse products"}
      </Link>
    </div>
  );
}
