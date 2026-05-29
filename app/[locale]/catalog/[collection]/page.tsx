import { notFound } from "next/navigation";
import { hasLocale } from "@/lib/i18n-config";
import { CatalogView } from "@/components/catalog/CatalogView";
import { isCatalogSort } from "@/lib/catalog-shared";
import {
  getCollectionBySlug,
  getCollections,
  getProducts,
} from "@/lib/queries/catalog";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/catalog/[collection]">) {
  const { locale, collection: slug } = await params;
  if (!hasLocale(locale)) return {};
  const collection = await getCollectionBySlug(slug);
  if (!collection) return {};
  const name = locale === "ar" ? collection.name_ar : collection.name_en;
  return { title: name };
}

export default async function CollectionPage({
  params,
  searchParams,
}: PageProps<"/[locale]/catalog/[collection]">) {
  const { locale, collection: slug } = await params;
  if (!hasLocale(locale)) notFound();

  const sp = await searchParams;
  const sortParam = typeof sp?.sort === "string" ? sp.sort : undefined;
  const sort = isCatalogSort(sortParam) ? sortParam : "featured";
  const sizeRaw = typeof sp?.size === "string" ? Number(sp.size) : NaN;
  const sizeInches = Number.isInteger(sizeRaw) && sizeRaw > 0 ? sizeRaw : undefined;
  const setOnly = sp?.type === "set";

  const collection = await getCollectionBySlug(slug);
  if (!collection) notFound();

  const [collections, products] = await Promise.all([
    getCollections(),
    getProducts({ collectionId: collection.id, sort, sizeInches, setOnly }),
  ]);

  return (
    <CatalogView
      locale={locale}
      collections={collections}
      products={products}
      activeCollection={collection}
      sort={sort}
    />
  );
}
