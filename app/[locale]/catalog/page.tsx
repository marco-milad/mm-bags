import { notFound } from "next/navigation";
import { hasLocale } from "@/lib/i18n-config";
import { CatalogView } from "@/components/catalog/CatalogView";
import { isCatalogSort } from "@/lib/catalog-shared";
import { getCollections, getProducts } from "@/lib/queries/catalog";

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

  const [collections, products] = await Promise.all([
    getCollections(),
    getProducts({ sort, sizeInches, setOnly }),
  ]);

  return (
    <CatalogView
      locale={locale}
      collections={collections}
      products={products}
      sort={sort}
    />
  );
}
