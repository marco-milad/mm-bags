import { notFound } from "next/navigation";
import { hasLocale } from "@/lib/i18n-config";
import { CatalogView } from "@/components/catalog/CatalogView";
import { isCatalogSort } from "@/lib/catalog-shared";
import { getProducts } from "@/lib/queries/catalog";
import { getTopLevelCategoriesWithCounts } from "@/lib/queries/categories";

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

  const [topLevel, products] = await Promise.all([
    getTopLevelCategoriesWithCounts(),
    getProducts({ sort, sizeInches, setOnly }),
  ]);

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
