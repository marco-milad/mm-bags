import Link from "next/link";
import { Heart, Search, User } from "lucide-react";
import type { Locale } from "@/lib/i18n-config";
import { CartIconButton } from "@/components/cart/CartIconButton";
import { LocaleSwitcher } from "./LocaleSwitcher";

type NavStrings = {
  home: string;
  catalog: string;
  about: string;
  cart: string;
  account: string;
  login: string;
  search: string;
};

export function Navbar({
  locale,
  t,
  brandName,
}: {
  locale: Locale;
  t: NavStrings;
  brandName: string;
}) {
  const base = `/${locale}`;
  return (
    <header className="sticky top-[var(--mm-banner-h,0px)] z-40 border-b border-[var(--color-border)] bg-[var(--color-bg)]/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
        <div className="flex items-center gap-6 md:gap-10">
          <Link
            href={base}
            className="font-display text-xl tracking-tight text-[var(--color-primary)]"
          >
            {brandName}
          </Link>
          <nav className="hidden items-center gap-6 text-sm md:flex">
            <Link href={`${base}/catalog`} className="hover:text-[var(--color-accent-dark)]">
              {t.catalog}
            </Link>
            <Link href={`${base}/about`} className="hover:text-[var(--color-accent-dark)]">
              {t.about}
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={t.search}
            className="rounded-full p-2 text-[var(--color-text)] transition hover:bg-[var(--color-surface)]"
          >
            <Search className="h-5 w-5" />
          </button>
          <Link
            href={`${base}/account/wishlist`}
            aria-label="Wishlist"
            className="hidden rounded-full p-2 text-[var(--color-text)] transition hover:bg-[var(--color-surface)] md:inline-flex"
          >
            <Heart className="h-5 w-5" />
          </Link>
          <Link
            href={`${base}/account`}
            aria-label={t.account}
            className="hidden rounded-full p-2 text-[var(--color-text)] transition hover:bg-[var(--color-surface)] md:inline-flex"
          >
            <User className="h-5 w-5" />
          </Link>
          <CartIconButton label={t.cart} />
          <LocaleSwitcher locale={locale} />
        </div>
      </div>
    </header>
  );
}
