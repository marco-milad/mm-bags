import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { hasLocale } from "@/lib/i18n-config";
import { getProducts } from "@/lib/queries/catalog";
import { resolveCollectionScope } from "@/lib/queries/categories";
import { CompareTable } from "@/components/catalog/CompareTable";

export const dynamic = "force-dynamic";

/** Wider tables get noisy and small — cap so the page scans clean. */
const MAX_COMPARE = 6;

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/catalog/[collection]/compare">) {
  const { locale, collection: slug } = await params;
  if (!hasLocale(locale)) return {};
  const scope = await resolveCollectionScope(slug);
  if (!scope) return {};
  const name =
    locale === "ar" ? scope.collection.name_ar : scope.collection.name_en;
  return {
    title: `${locale === "ar" ? "قارن بين" : "Compare"} ${name}`,
  };
}

export default async function CollectionComparePage({
  params,
}: PageProps<"/[locale]/catalog/[collection]/compare">) {
  const { locale, collection: slug } = await params;
  if (!hasLocale(locale)) notFound();

  const scope = await resolveCollectionScope(slug);
  if (!scope) notFound();

  const { collection, collectionIds } = scope;

  // Use the standard featured ordering — `sort_order` then most-recent.
  // Cap to MAX_COMPARE so the table doesn't blow out horizontally for
  // collections with many products.
  const products = (await getProducts({ collectionIds, sort: "featured" }))
    .slice(0, MAX_COMPARE);

  const collectionName =
    locale === "ar" ? collection.name_ar : collection.name_en;
  const isRTL = locale === "ar";
  const Back = isRTL ? ArrowRight : ArrowLeft;

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
      {/* Breadcrumb / back link */}
      <nav
        aria-label={isRTL ? "مسار التنقل" : "Breadcrumb"}
        className="mb-4 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-secondary)]"
      >
        <Link
          href={`/${locale}`}
          className="hover:text-[var(--color-text)]"
        >
          {isRTL ? "الرئيسية" : "Home"}
        </Link>
        <span aria-hidden>/</span>
        <Link
          href={`/${locale}/catalog/${collection.slug}`}
          className="hover:text-[var(--color-text)]"
        >
          {collectionName}
        </Link>
        <span aria-hidden>/</span>
        <span className="text-[var(--color-text)]">
          {isRTL ? "مقارنة" : "Compare"}
        </span>
      </nav>

      <header className="mb-8 flex flex-col gap-2">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-[var(--color-accent-dark)]">
          {isRTL ? "مقارنة الموديلات" : "Model comparison"}
        </p>
        <h1 className="font-display text-3xl md:text-4xl">
          {isRTL ? `قارن بين ${collectionName}` : `Compare ${collectionName}`}
        </h1>
        <p className="max-w-2xl text-sm text-[var(--color-text-secondary)]">
          {isRTL
            ? "كل الفروقات بين الموديلات في صفحة واحدة — السعر، المقاسات، الخامة، والمميزات."
            : "Every difference between the models on one page — price, sizes, material, and features."}
        </p>
      </header>

      <CompareTable locale={locale} products={products} />

      <div className="mt-10 flex justify-center">
        <Link
          href={`/${locale}/catalog/${collection.slug}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-5 py-2.5 text-sm font-medium text-[var(--color-text)] transition hover:border-[var(--color-accent)]"
        >
          <Back className="h-4 w-4" />
          {isRTL ? `العودة إلى ${collectionName}` : `Back to ${collectionName}`}
        </Link>
      </div>
    </section>
  );
}
