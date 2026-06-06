import Image from "next/image";
import Link from "next/link";
import { Heart, User } from "lucide-react";
import type { Locale } from "@/lib/i18n-config";
import type { ProductWithVariants } from "@/lib/catalog-shared";
import type { TopLevelCategory } from "@/lib/queries/categories";
import { CartIconButton } from "@/components/cart/CartIconButton";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { MegaMenu } from "./MegaMenu";
import { MobileMenuSheet } from "./MobileMenuSheet";
import { SearchDialog } from "./SearchDialog";

type NavStrings = {
  home: string;
  catalog: string;
  categories: string;
  about: string;
  cart: string;
  account: string;
  wishlist: string;
  login: string;
  search: string;
  search_placeholder: string;
  search_submit: string;
  search_empty: string;
  menu: string;
  contact: string;
  shop_all: string;
  featured: string;
};

export function Navbar({
  locale,
  t,
  brandName,
  megaCategories,
  megaFeatured,
}: {
  locale: Locale;
  t: NavStrings;
  brandName: string;
  megaCategories: TopLevelCategory[];
  megaFeatured: ProductWithVariants[];
}) {
  const base = `/${locale}`;
  return (
    <header className="sticky top-[var(--mm-banner-h,0px)] z-40 border-b border-[var(--color-border)] bg-[var(--color-bg)]">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
        <div className="flex items-center gap-2 md:gap-10">
          <MobileMenuSheet
            locale={locale}
            categories={megaCategories}
            labels={{
              menu: t.menu,
              home: t.home,
              catalog: t.catalog,
              categories: t.categories,
              about: t.about,
              contact: t.contact,
              account: t.account,
              wishlist: t.wishlist,
              shop_all: t.shop_all,
            }}
          />
          <Link
            href={base}
            aria-label={brandName}
            className="inline-flex items-center"
          >
            <Image
              src="/assets/logos/logo-navbar.svg"
              alt={brandName}
              width={232}
              height={64}
              priority
              className="h-10 w-auto md:h-11"
            />
          </Link>
          <nav className="hidden items-center gap-6 text-sm md:flex">
            <MegaMenu
              locale={locale}
              triggerLabel={t.catalog}
              shopAllLabel={t.shop_all}
              featuredLabel={t.featured}
              categories={megaCategories}
              featured={megaFeatured}
            />
            <Link
              href={`${base}/categories`}
              className="hover:text-[var(--color-accent-dark)]"
            >
              {t.categories}
            </Link>
            <Link href={`${base}/about`} className="hover:text-[var(--color-accent-dark)]">
              {t.about}
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-1">
          <SearchDialog
            locale={locale}
            labels={{
              search: t.search,
              search_placeholder: t.search_placeholder,
              search_submit: t.search_submit,
              search_empty: t.search_empty,
            }}
          />
          <Link
            href={`${base}/account/wishlist`}
            aria-label={t.wishlist}
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
