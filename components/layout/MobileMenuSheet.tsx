"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Heart,
  Home,
  Info,
  MessageCircle,
  Menu,
  Package2,
  User,
  Tag,
} from "lucide-react";
import type { Locale } from "@/lib/i18n-config";
import { defaultLocale, locales } from "@/lib/i18n-config";
import type { TopLevelCategory } from "@/lib/queries/categories";
import { categoryLucideIcon } from "@/lib/categories-config";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

type Labels = {
  menu: string;
  home: string;
  catalog: string;
  categories: string;
  about: string;
  contact: string;
  account: string;
  wishlist: string;
  shop_all: string;
};

/**
 * Mobile-only slide-in menu. Mirrors what desktop users get from the Navbar
 * center links + MegaMenu: top primary links, the 6 collections grid, and
 * About / Contact / Language switcher at the bottom. Closes on every link
 * click via Next's pathname-change effect.
 */
export function MobileMenuSheet({
  locale,
  labels,
  categories,
}: {
  locale: Locale;
  labels: Labels;
  categories: TopLevelCategory[];
}) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const base = `/${locale}`;
  const isRTL = locale === "ar";

  useEffect(() => setMounted(true), []);

  // Close the sheet whenever the URL changes so the menu doesn't linger after
  // navigation. Don't fire on first paint — pathname is set immediately.
  const [lastPath, setLastPath] = useState(pathname);
  useEffect(() => {
    if (pathname !== lastPath) {
      setOpen(false);
      setLastPath(pathname);
    }
  }, [pathname, lastPath]);

  const otherLocale = locales.find((l) => l !== locale) ?? defaultLocale;
  const swappedPath =
    pathname?.replace(new RegExp(`^/${locale}`), `/${otherLocale}`) ??
    `/${otherLocale}`;

  // RTL → sheet slides in from the right (start side); LTR → left.
  const sheetSide = isRTL ? "right" : "left";

  // WhatsApp contact — same number + prefilled message as the floating FAB.
  const waNumber = (
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "+201000000000"
  ).replace(/[^\d]/g, "");
  const waMessage = isRTL
    ? "أهلاً ماركو، عايز أسأل عن منتج من M.M Bags."
    : "Hi Marco, I'd like to ask about a product on M.M Bags.";
  const waHref = `https://wa.me/${waNumber}?text=${encodeURIComponent(waMessage)}`;

  const primary = [
    { href: base, icon: Home, label: labels.home },
    { href: `${base}/catalog`, icon: Package2, label: labels.catalog },
    { href: `${base}/categories`, icon: Tag, label: labels.categories },
    { href: `${base}/about`, icon: Info, label: labels.about },
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={labels.menu}
        className="rounded-full p-2 text-[var(--color-text)] transition hover:bg-[var(--color-surface)] md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mounted && (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent
            side={sheetSide}
            closeAriaLabel={isRTL ? "إغلاق" : "Close"}
            className="overflow-y-auto"
          >
            <header className="flex h-16 shrink-0 items-center border-b border-[var(--color-border)] px-6">
              <Image
                src="/assets/logos/logo-navbar.svg"
                alt="M.M Bags"
                width={232}
                height={64}
                className="h-9 w-auto"
              />
              <SheetTitle className="sr-only">{labels.menu}</SheetTitle>
            </header>

            <div className="flex-1 px-2 py-4">
              {/* Primary links */}
              <ul className="space-y-1">
                {primary.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-[var(--color-text)] transition hover:bg-[var(--color-surface)]"
                      >
                        <Icon className="h-5 w-5 text-[var(--color-text-secondary)]" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>

              {/* Collections grid — same content as desktop MegaMenu */}
              {categories.length > 0 && (
                <div className="mt-4 border-t border-[var(--color-border)] pt-4">
                  <p className="px-4 pb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--color-text-secondary)]">
                    {isRTL ? "كل التشكيلات" : "All collections"}
                  </p>
                  <ul className="grid grid-cols-2 gap-2 px-2">
                    {categories.map((cat) => {
                      const Icon = categoryLucideIcon(cat.slug);
                      return (
                        <li key={cat.slug}>
                          <Link
                            href={`${base}/catalog/${cat.slug}`}
                            className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3 transition hover:border-[var(--color-accent)] hover:bg-[var(--color-surface)]"
                          >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface)] text-[var(--color-text)]">
                              <Icon className="h-4 w-4" strokeWidth={1.75} />
                            </span>
                            <span className="flex flex-1 flex-col">
                              <span className="text-sm font-semibold text-[var(--color-text)]">
                                {isRTL ? cat.name_ar : cat.name_en}
                              </span>
                              <span className="text-[11px] text-[var(--color-text-secondary)]">
                                {cat.productCount}{" "}
                                {isRTL
                                  ? "منتج"
                                  : cat.productCount === 1
                                    ? "product"
                                    : "products"}
                              </span>
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>

                  <Link
                    href={`${base}/catalog`}
                    className="mt-3 flex items-center justify-center gap-1.5 rounded-lg px-4 py-3 text-sm font-semibold text-[var(--color-primary)] underline-offset-4 hover:underline"
                  >
                    {labels.shop_all}
                    <span aria-hidden>{isRTL ? "←" : "→"}</span>
                  </Link>
                </div>
              )}

              {/* Account shortcuts */}
              <div className="mt-4 border-t border-[var(--color-border)] pt-4">
                <ul className="space-y-1">
                  <li>
                    <Link
                      href={`${base}/account`}
                      className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-[var(--color-text)] transition hover:bg-[var(--color-surface)]"
                    >
                      <User className="h-5 w-5 text-[var(--color-text-secondary)]" />
                      {labels.account}
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={`${base}/account/wishlist`}
                      className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-[var(--color-text)] transition hover:bg-[var(--color-surface)]"
                    >
                      <Heart className="h-5 w-5 text-[var(--color-text-secondary)]" />
                      {labels.wishlist}
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Contact + Language */}
              <div className="mt-4 border-t border-[var(--color-border)] pt-4">
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-[var(--color-text)] transition hover:bg-[var(--color-surface)]"
                >
                  <MessageCircle className="h-5 w-5 text-[var(--color-text-secondary)]" />
                  {labels.contact}
                </a>

                <Link
                  href={swappedPath}
                  prefetch={false}
                  className="mx-2 mt-2 inline-flex items-center justify-center rounded-full border border-[var(--color-border)] px-4 py-2 font-mono text-xs uppercase tracking-wider text-[var(--color-text-secondary)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-text)]"
                >
                  {otherLocale === "ar" ? "العربية" : "English"}
                </Link>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}
