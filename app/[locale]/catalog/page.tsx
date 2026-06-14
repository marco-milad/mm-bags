import { notFound } from "next/navigation";
import { hasLocale } from "@/lib/i18n-config";
import { CatalogView } from "@/components/catalog/CatalogView";
import { isCatalogSort } from "@/lib/catalog-shared";
import { getProducts } from "@/lib/queries/catalog";
import { getTopLevelCategoriesWithCounts } from "@/lib/queries/categories";
import { bucketById } from "@/lib/material-buckets";

export const dynamic = "force-dynamic";

export default async function CatalogPage({
  params,
  searchParams,
}: PageProps<"/[locale]/catalog">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();

  const sp = await searchParams;
  const sortParam = typeof sp?.sort === "string" ? sp.sort : undefined;
  const sort = isCatalogSort(sortParam) ? sortParam : "featured";
  const sizeRaw = typeof sp?.size === "string" ? Number(sp.size) : NaN;
  const sizeInches = Number.isInteger(sizeRaw) && sizeRaw > 0 ? sizeRaw : undefined;
  const setOnly = sp?.type === "set";
  const q = typeof sp?.q === "string" ? sp.q.trim().slice(0, 80) : undefined;
  const material =
    typeof sp?.material === "string"
      ? sp.material.trim().slice(0, 80)
      : undefined;

  // Bucket-based material filter — `?materialBucket=nylon` expands into an
  // IN (...) clause over every raw material_type that belongs to the bucket
  // (see lib/material-buckets.ts). Falls back silently if the slug is
  // unknown so a stale link doesn't error.
  const materialBucketId =
    typeof sp?.materialBucket === "string"
      ? sp.materialBucket.trim().slice(0, 40)
      : undefined;
  const bucket = materialBucketId ? bucketById(materialBucketId) : null;

  // Discover the raw member material_type values for this bucket. We do a
  // tiny lookup here because the bucket meta only knows its matchers; the
  // actual member list lives in the DB.
  let bucketMembers: string[] | undefined;
  if (bucket) {
    const { getMaterialCounts } = await import("@/lib/queries/catalog");
    const all = await getMaterialCounts();
    bucketMembers = all.find((b) => b.id === bucket.id)?.members;
  }

  const [topLevel, products] = await Promise.all([
    getTopLevelCategoriesWithCounts(),
    getProducts({
      sort,
      sizeInches,
      setOnly,
      q,
      material,
      materials: bucketMembers,
    }),
  ]);

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
    />
  );
}
