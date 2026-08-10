import Link from "next/link";
import { GitCompareArrows, MessageCircle } from "lucide-react";
import type { Locale } from "@/lib/i18n-config";
import type { Collection } from "@/lib/supabase/types";
import type { CatalogSort, ProductWithVariants } from "@/lib/catalog-shared";
import { effectivePrice } from "@/lib/catalog-shared";
import { formatPriceEGP } from "@/lib/utils";
import { CollectionFilter } from "./CollectionFilter";
import { CatalogToolbar } from "./CatalogToolbar";
import { ProductCard } from "@/components/product/ProductCard";

const WHATSAPP_NUMBER = (
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "+201229749608"
).replace(/\D/g, "");

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
  compareHref,
  compareLabel,
}: {
  locale: Locale;
  collections: Collection[];
  products: ProductWithVariants[];
  activeCollection?: Collection | null;
  sort: CatalogSort;
  crumbs?: CrumbLink[];
  filterAllHref?: string;
  filterAllLabel?: { ar: string; en: string };
  /** When set, renders a "Compare models" CTA under the title that links
      to the given URL (typically the collection's `/compare` page). */
  compareHref?: string;
  /** Localized labels for the compare CTA; falls back to default copy. */
  compareLabel?: { ar: string; en: string };
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
        {compareHref && (
          <Link
            href={compareHref}
            className="mt-1 inline-flex w-fit items-center gap-2 rounded-full border border-[var(--color-accent)] bg-[var(--color-accent)]/10 px-4 py-2 text-sm font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-accent)] hover:text-[var(--color-primary)]"
          >
            <GitCompareArrows className="h-4 w-4" />
            {locale === "ar"
              ? compareLabel?.ar ?? "قارن بين الموديلات"
              : compareLabel?.en ?? "Compare models"}
          </Link>
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
        {/* Compute a min/max price band from the currently-visible
            products so the toolbar can display "24 products · from
            EGP 350" up-front. Egyptian shoppers scan the page for
            price before they scan products; putting the floor value
            in the toolbar saves the "how much does this collection
            cost?" click into a random card. */}
        <CatalogToolbar
          locale={locale}
          count={products.length}
          currentSort={sort}
          minPrice={
            products.length > 0
              ? Math.min(...products.map((p) => effectivePrice(p)))
              : null
          }
        />
      </div>

      {products.length === 0 ? (
        <EmptyState locale={locale} hasFilter={!!activeCollection} />
      ) : (
        // `auto-rows-fr` makes every row the height of the tallest card
        // in that row, and `h-full` on the <li> propagates that height
        // down so the card stretches to fill its grid cell. Together
        // with the square image aspect inside ProductCard, this gives
        // a clean, uniform grid regardless of source orientation or
        // whether a product has spec chips / sale badge / low-stock line.
        <ul className="mt-8 grid auto-rows-fr grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-3 md:gap-x-6 md:gap-y-8 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-10">
          {products.map((product) => (
            <li key={product.id} className="h-full">
              <ProductCard product={product} locale={locale} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function EmptyState({ locale, hasFilter }: { locale: Locale; hasFilter: boolean }) {
  // WhatsApp deep-link with a pre-filled request message. Turns the
  // dead-end "nothing here" state into a lead-capture: instead of
  // sending the visitor back to Home (which is where they came from),
  // ask them to tell us what they're looking for.
  const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    locale === "ar"
      ? "أهلاً، بدوّر على شنطة معينة مش لاقيها على الموقع. تقدروا تساعدوني؟"
      : "Hi, I'm looking for a specific bag I can't find on the site. Can you help?",
  )}`;
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
      <p className="max-w-md text-sm text-[var(--color-text-secondary)]">
        {locale === "ar"
          ? "بتدوّر على حاجة معينة؟ ابعتلنا على واتساب اللي محتاجه ولو عندنا هنقولك."
          : "Looking for something specific? Message us on WhatsApp — if we have it, we'll get it to you."}
      </p>
      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-primary-light)]"
      >
        <MessageCircle className="h-4 w-4" />
        {locale === "ar" ? "ابعتلنا على واتساب" : "Message us on WhatsApp"}
      </a>
    </div>
  );
}
