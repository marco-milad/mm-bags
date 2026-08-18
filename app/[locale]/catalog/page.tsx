import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "@/lib/i18n-config";
import { CatalogView } from "@/components/catalog/CatalogView";
import { CATALOG_PAGE_SIZE } from "@/lib/catalog-shared";
import { localeAlternates } from "@/lib/seo/site";
import { getCatalogPage } from "@/lib/queries/catalog";
import { getTopLevelCategoriesWithCounts } from "@/lib/queries/categories";
import { pickCatalogFilters, resolveCatalogFilters } from "@/lib/catalog/filters";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/catalog">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const isAr = locale === "ar";
  return {
    title: isAr ? "كل المنتجات | M.M Bags" : "All products | M.M Bags",
    description: isAr
      ? "تسوق كل منتجات M.M Bags — شنط السفر، الظهر، المدارس، الحريم، اليد، واللاب توب. شحن لكل 27 محافظة."
      : "Shop the full M.M Bags catalog — travel, backpacks, school, ladies, handbags, and laptop sleeves. Ships across Egypt.",
    alternates: localeAlternates("/catalog"),
  };
}

export default async function CatalogPage({
  params,
  searchParams,
}: PageProps<"/[locale]/catalog">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();

  const sp = await searchParams;
  // Filter parsing lives in lib/catalog/filters.ts so the first render
  // and the "load more" action interpret the URL identically. The
  // bucket-based material filter (`?materialBucket=nylon`) expands into
  // an IN (...) clause over every raw material_type in the bucket (see
  // lib/material-buckets.ts) and falls back silently for unknown slugs.
  const filters = pickCatalogFilters(sp);
  const { sort, sizeInches, setOnly, q, material, materials, bucket } =
    await resolveCatalogFilters(filters);

  // `?page=N` means "the customer has loaded N pages" (the load-more
  // control replaces the URL with page+1 and lets this page re-render).
  // We render pages 1..N cumulatively so the URL is the single source
  // of truth: a refresh, a shared link, or Back from a product page all
  // show exactly what was loaded. The default (no param) is the first 24.
  const pageRaw = typeof sp?.page === "string" ? Number(sp.page) : 1;
  const pagesLoaded =
    Number.isInteger(pageRaw) && pageRaw >= 1 ? Math.min(pageRaw, 50) : 1;

  const [topLevel, page] = await Promise.all([
    getTopLevelCategoriesWithCounts(),
    getCatalogPage({
      sort,
      sizeInches,
      setOnly,
      q,
      material,
      materials,
      offset: 0,
      limit: CATALOG_PAGE_SIZE * pagesLoaded,
    }),
  ]);
  const products = page.products;

  const bucketLabel = bucket && (locale === "ar" ? bucket.ar : bucket.en);

  const crumbs = [
    { href: `/${locale}`, label: locale === "ar" ? "الرئيسية" : "Home" },
    {
      href: `/${locale}/categories`,
      label: locale === "ar" ? "التشكيلات" : "Categories",
    },
    {
      href: `/${locale}/catalog`,
      label: locale === "ar" ? "كل المنتجات" : "All products",
    },
    ...(bucket && bucketLabel
      ? [
          {
            href: `/${locale}/catalog?materialBucket=${bucket.id}`,
            label: locale === "ar" ? `الخامة: ${bucketLabel}` : `Material: ${bucketLabel}`,
          },
        ]
      : material
      ? [
          {
            href: `/${locale}/catalog?material=${encodeURIComponent(material)}`,
            label: locale === "ar" ? `الخامة: ${material}` : `Material: ${material}`,
          },
        ]
      : []),
    ...(q
      ? [
          {
            href: `/${locale}/catalog?q=${encodeURIComponent(q)}`,
            label: locale === "ar" ? `بحث: ${q}` : `Search: ${q}`,
          },
        ]
      : []),
  ];

  return (
    <CatalogView
      locale={locale}
      collections={topLevel}
      products={products}
      sort={sort}
      crumbs={crumbs}
      pagination={{
        total: page.total,
        minPrice: page.minPrice,
        nextPage: pagesLoaded + 1,
        hasMore: page.hasMore,
      }}
    />
  );
}
