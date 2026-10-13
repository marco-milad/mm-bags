"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Home, Package2, User } from "lucide-react";
import type { Locale } from "@/lib/i18n-config";
import { activeBottomNavTab, type BottomNavTab } from "@/lib/nav/active";

type NavStrings = {
  home: string;
  catalog: string;
  wishlist: string;
  account: string;
};

export function MobileBottomNav({
  locale,
  t,
}: {
  locale: Locale;
  t: NavStrings;
}) {
  // Client component only for usePathname(): the bar lives in the [locale]
  // layout, which does not re-render on navigation, so the active tab has to
  // be derived on the client. Matching rules live in lib/nav/active.ts.
  const active = activeBottomNavTab(usePathname(), locale);
  const base = `/${locale}`;
  // Cart intentionally omitted — the top-right Cart icon opens the
  // CartDrawer and is visible on mobile too, so this used to duplicate it
  // (and the old /cart link 404'd).
  const items: {
    tab: BottomNavTab;
    href: string;
    icon: typeof Home;
    label: string;
  }[] = [
    { tab: "home", href: base, icon: Home, label: t.home },
    { tab: "catalog", href: `${base}/catalog`, icon: Package2, label: t.catalog },
    { tab: "wishlist", href: `${base}/account/wishlist`, icon: Heart, label: t.wishlist },
    { tab: "account", href: `${base}/account`, icon: User, label: t.account },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--color-border)] bg-[var(--color-bg)]/95 backdrop-blur md:hidden"
      aria-label={locale === "ar" ? "التنقل السريع" : "Quick navigation"}
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.tab === active;
          return (
            <li key={item.tab} className="flex">
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`relative flex min-h-11 flex-1 flex-col items-center justify-center gap-1 py-2.5 text-xs transition ${
                  isActive
                    ? "font-semibold text-[var(--color-primary)]"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]"
                }`}
              >
                {/* Brass bar on the bar's top edge — a second cue besides
                    colour, so the current tab reads at a glance. */}
                {isActive && (
                  <span
                    aria-hidden
                    className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-[var(--color-accent)]"
                  />
                )}
                <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
