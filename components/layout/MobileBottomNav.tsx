import Link from "next/link";
import { Heart, Home, Package2, ShoppingBag, User } from "lucide-react";
import type { Locale } from "@/lib/i18n-config";

type NavStrings = {
  home: string;
  catalog: string;
  cart: string;
  account: string;
};

export function MobileBottomNav({
  locale,
  t,
}: {
  locale: Locale;
  t: NavStrings;
}) {
  const base = `/${locale}`;
  const items = [
    { href: base, icon: Home, label: t.home },
    { href: `${base}/catalog`, icon: Package2, label: t.catalog },
    { href: `${base}/account/wishlist`, icon: Heart, label: "Wishlist" },
    { href: `${base}/cart`, icon: ShoppingBag, label: t.cart },
    { href: `${base}/account`, icon: User, label: t.account },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--color-border)] bg-[var(--color-bg)]/95 backdrop-blur md:hidden"
      aria-label="Mobile bottom navigation"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.href + item.label} className="flex">
              <Link
                href={item.href}
                className="flex flex-1 flex-col items-center gap-1 py-3 text-[10px] text-[var(--color-text-secondary)] transition hover:text-[var(--color-primary)]"
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
