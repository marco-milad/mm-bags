import Link from "next/link";
import { preconnect } from "react-dom";
import { GitCompareArrows, LayoutGrid, MessageCircle, SearchX } from "lucide-react";
import type { Locale } from "@/lib/i18n-config";
import type { Collection } from "@/lib/supabase/types";
import type {
  CatalogCardProduct,
  CatalogSort,
} from "@/lib/catalog-shared";
import { effectivePrice } from "@/lib/catalog-shared";
import { CollectionFilter } from "./CollectionFilter";
import { CatalogToolbar } from "./CatalogToolbar";
import { CatalogCards } from "./CatalogCards";
import { LoadMoreProducts } from "./LoadMoreProducts";

/** Grid classes shared by the SSR'd first page and appended pages so
    "load more" rows are visually continuous with the first ones.
    `auto-rows-fr` makes every row the height of the tallest card in
    that row, and `h-full` on the <li> propagates that height down so
    the card stretches to fill its grid cell. Also used by the catalog
    loading.tsx skeletons so the placeholder grid matches the real one. */
export const GRID_CLASS =
  "mt-8 grid auto-rows-fr grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-3 md:gap-x-6 md:gap-y-8 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-10";

/** Pagination state for the main /catalog page. Absent on collection
    pages, which still render their full (small) list as before. */
export type CatalogPagination = {
  /** Total products matching the current filters, across all pages. */
  total: number;
  /** Cheapest effective price across ALL matching products. */
  minPrice: number | null;
  /** Page the "load more" button should request next. */
  nextPage: number;
  hasMore: boolean;
};

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
  pagination,
  select,
  q,
}: {
  locale: Locale;
  collections: Collection[];
  products: CatalogCardProduct[];
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
  /** When set (main catalog), the toolbar shows the TOTAL count / min
      price and a "load more" control appends further pages. */
  pagination?: CatalogPagination;
  /** When set (search results only), cards fire `select_item` with this
      attribution so search click-through can be measured. */
  select?: { searchId?: string; listId: string };
  /** The shopper's search query (main catalog only). When set and nothing
      matched, a "no results for …" state replaces the empty-catalog one. */
  q?: string;
}) {
  // Every card image comes from Supabase's render endpoint on a
  // different origin than the HTML. Warming that connection from <head>
  // takes DNS + TCP + TLS off the LCP image's critical path.
  const imageOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (imageOrigin) preconnect(imageOrigin);

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
          count={pagination ? pagination.total : products.length}
          currentSort={sort}
          minPrice={
            pagination
              ? pagination.minPrice
              : products.length > 0
                ? Math.min(...products.map((p) => effectivePrice(p)))
                : null
          }
        />
      </div>

      {products.length === 0 ? (
        q ? (
          <NoResultsState locale={locale} q={q} collections={collections} />
        ) : (
          <EmptyState locale={locale} hasFilter={!!activeCollection} />
        )
      ) : (
        <>
          <ul className={GRID_CLASS}>
            <CatalogCards products={products} locale={locale} select={select} />
          </ul>
          {pagination && (
            <LoadMoreProducts
              locale={locale}
              nextPage={pagination.nextPage}
              hasMore={pagination.hasMore}
              total={pagination.total}
              shown={products.length}
            />
          )}
        </>
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
        className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--color-primary-light)]"
      >
        <MessageCircle className="h-4 w-4" />
        {locale === "ar" ? "ابعتلنا على واتساب" : "Message us on WhatsApp"}
      </a>
    </div>
  );
}

/**
 * A search that matched nothing. Distinct from EmptyState on purpose: telling
 * a shopper "the catalog is empty" after a typo reads as "this shop sells
 * nothing". Instead: echo the query, give quick tips, offer the top-level
 * categories as one-tap exits, and keep the WhatsApp ask — carrying the query
 * so the owner sees exactly what was wanted.
 */
function NoResultsState({
  locale,
  q,
  collections,
}: {
  locale: Locale;
  q: string;
  collections: Collection[];
}) {
  const isAr = locale === "ar";
  const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    isAr
      ? `أهلاً، دوّرت على «${q}» في الموقع ومالقيتش. ممكن تساعدوني؟`
      : `Hi, I searched the site for “${q}” and couldn't find it. Can you help?`,
  )}`;
  const tips = isAr
    ? [
        "اتأكد من الإملا",
        "جرّب كلمة أعمّ، زي «شنطة سفر» أو «شنطة ظهر»",
        "جرّب تكتبها بالإنجليزي أو بالعربي",
      ]
    : [
        "Check the spelling",
        "Try a broader word, like “travel bag” or “backpack”",
        "Try searching in Arabic or English",
      ];

  return (
    <div className="mt-8 flex flex-col items-center gap-4 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-10 text-center md:px-6 md:py-14">
      <SearchX aria-hidden className="h-8 w-8 text-[var(--color-accent-dark)]" />
      <h2 className="max-w-full break-words font-display text-2xl">
        {isAr ? "مالقيناش نتايج لـ " : "No results for "}
        {isAr ? "«" : "“"}
        <bdi>{q}</bdi>
        {isAr ? "»" : "”"}
      </h2>

      <ul className="flex max-w-md flex-col gap-1 text-sm text-[var(--color-text-secondary)]">
        {tips.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>

      {collections.length > 0 && (
        <div className="flex w-full flex-col items-center gap-2">
          <p className="text-xs font-medium text-[var(--color-text-secondary)]">
            {isAr ? "أو اتفرّج على التشكيلات" : "Or browse a category"}
          </p>
          <ul className="flex flex-wrap justify-center gap-2">
            {collections.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/${locale}/catalog/${c.slug}`}
                  // Same reasoning as CollectionFilter: dynamic routes, no
                  // point prefetching every chip.
                  prefetch={false}
                  className="inline-flex min-h-11 items-center rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-4 text-sm font-medium text-[var(--color-text)] transition hover:border-[var(--color-accent)]"
                >
                  {isAr ? c.name_ar : c.name_en}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <Link
          href={`/${locale}/catalog`}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--color-border)] px-5 text-sm font-medium text-[var(--color-text)] transition hover:border-[var(--color-accent)]"
        >
          <LayoutGrid className="h-4 w-4" />
          {isAr ? "شوف كل المنتجات" : "See all products"}
        </Link>
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--color-primary)] px-5 text-sm font-medium text-white transition hover:bg-[var(--color-primary-light)]"
        >
          <MessageCircle className="h-4 w-4" />
          {isAr ? "قولّنا بتدوّر على إيه" : "Tell us what you're looking for"}
        </a>
      </div>
    </div>
  );
}
