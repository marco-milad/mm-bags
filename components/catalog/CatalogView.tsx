import Link from "next/link";
import type { Locale } from "@/lib/i18n-config";
import type { Collection } from "@/lib/supabase/types";
import type { CatalogSort, ProductWithVariants } from "@/lib/catalog-shared";
import { CollectionFilter } from "./CollectionFilter";
import { CatalogToolbar } from "./CatalogToolbar";
import { ProductCard } from "@/components/product/ProductCard";

export type CrumbLink = { href: string; label: string };

export function CatalogView({
  locale,
  collections,
  products,
  activeCollection,
  sort,
  crumbs,
  filterAllHref,
  filterAllLabel,
}: {
  locale: Locale;
  collections: Collection[];
  products: ProductWithVariants[];
  activeCollection?: Collection | null;
  sort: CatalogSort;
  crumbs?: CrumbLink[];
  filterAllHref?: string;
  filterAllLabel?: { ar: string; en: string };
}) {
  const title = activeCollection
    ? locale === "ar"
      ? activeCollection.name_ar
      : activeCollection.name_en
    : locale === "ar"
      ? "كل المنتجات"
      : "All products";

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
      {crumbs && crumbs.length > 0 && (
        <nav
          aria-label={locale === "ar" ? "مسار التنقل" : "Breadcrumb"}
          className="mb-4 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-secondary)]"
        >
          {crumbs.map((c, i) => (
            <span key={i} className="inline-flex items-center gap-2">
              {i > 0 && <span aria-hidden>/</span>}
              {i === crumbs.length - 1 ? (
                <span className="text-[var(--color-text)]">{c.label}</span>
              ) : (
                <Link href={c.href} className="hover:text-[var(--color-text)]">
                  {c.label}
                </Link>
              )}
            </span>
          ))}
        </nav>
      )}

      <header className="mb-6 flex flex-col gap-2">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-[var(--color-text-secondary)]">
          {locale === "ar" ? "تسوق" : "Shop"}
        </p>
        <h1 className="font-display text-3xl md:text-4xl">{title}</h1>
        {activeCollection?.description_ar && (
          <p className="max-w-2xl text-sm text-[var(--color-text-secondary)]">
            {locale === "ar"
              ? activeCollection.description_ar
              : activeCollection.description_en ?? activeCollection.description_ar}
          </p>
        )}
      </header>

      <CollectionFilter
        locale={locale}
        collections={collections}
        activeSlug={activeCollection?.slug}
        allHref={filterAllHref}
        allLabel={filterAllLabel}
      />

      <div className="mt-3">
        <CatalogToolbar locale={locale} count={products.length} currentSort={sort} />
      </div>

      {products.length === 0 ? (
        <EmptyState locale={locale} hasFilter={!!activeCollection} />
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} locale={locale} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function EmptyState({ locale, hasFilter }: { locale: Locale; hasFilter: boolean }) {
  return (
    <div className="mt-12 flex flex-col items-center gap-3 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-16 text-center">
      <p className="font-display text-2xl">
        {hasFilter
          ? locale === "ar"
            ? "مفيش منتجات في التشكيلة دي لسه"
            : "No products in this collection yet"
          : locale === "ar"
            ? "الكاتالوج لسه فاضي"
            : "Catalog is empty"}
      </p>
      <p className="text-sm text-[var(--color-text-secondary)]">
        {locale === "ar"
          ? "ارجع تاني قريب — بنضيف منتجات جديدة كل أسبوع."
          : "Check back soon — we add new products every week."}
      </p>
      <Link
        href={`/${locale}`}
        className="mt-2 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-primary-light)]"
      >
        {locale === "ar" ? "الرئيسية" : "Home"}
      </Link>
    </div>
  );
}
