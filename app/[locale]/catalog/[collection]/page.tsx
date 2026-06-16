import { notFound } from "next/navigation";
import { hasLocale } from "@/lib/i18n-config";
import { CatalogView } from "@/components/catalog/CatalogView";
import { isCatalogSort } from "@/lib/catalog-shared";
import {
  absoluteUrl,
  localeAlternates,
} from "@/lib/seo/site";
import {
  breadcrumbSchema,
  collectionPageSchema,
} from "@/lib/seo/jsonld";
import { JsonLd } from "@/components/seo/JsonLd";
import { getCollectionBySlug, getProducts } from "@/lib/queries/catalog";
import {
  getSubCollections,
  getTopLevelCategoriesWithCounts,
  resolveCollectionScope,
} from "@/lib/queries/categories";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/catalog/[collection]">) {
  const { locale, collection: slug } = await params;
  if (!hasLocale(locale)) return {};
  const collection = await getCollectionBySlug(slug);
  if (!collection) return {};
  const name = locale === "ar" ? collection.name_ar : collection.name_en;
  const isAr = locale === "ar";
  // Fetch product count for the description; cheap because it's a
  // count-only query on the collection scope.
  const scope = await resolveCollectionScope(slug);
  const products = scope
    ? await getProducts({ collectionIds: scope.collectionIds })
    : [];
  const description = isAr
    ? `تسوق ${name} من M.M Bags. ${products.length} منتج متاح. شحن لكل مصر.`
    : `Shop ${name} at M.M Bags. ${products.length} products available. Shipping across Egypt.`;
  return {
    title: `${name} | M.M Bags`,
    description,
    alternates: localeAlternates(`/catalog/${slug}`),
    openGraph: {
      title: `${name} · M.M Bags`,
      description,
      url: absoluteUrl(`/${locale}/catalog/${slug}`),
      type: "website",
      locale: isAr ? "ar_EG" : "en_US",
      images: [`/api/og?title=${encodeURIComponent(name)}`],
    },
  };
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

  const scope = await resolveCollectionScope(slug);
  if (!scope) notFound();

  const { collection, collectionIds, subCollections } = scope;

  // Build filter pills depending on whether this is a parent, leaf-with-siblings, or standalone leaf
  let filterCollections = subCollections; // parent's children
  let filterAllHref = `/${locale}/catalog/${collection.slug}`; // "All" goes back to parent
  let filterAllLabel = {
    ar: locale === "ar" ? "الكل" : "All",
    en: "All",
  };

  if (collection.parent_slug) {
    // We're on a child page — show siblings, "All" goes to parent
    const siblings = await getSubCollections(collection.parent_slug);
    filterCollections = siblings;
    filterAllHref = `/${locale}/catalog/${collection.parent_slug}`;
    const parent = await getCollectionBySlug(collection.parent_slug);
    if (parent) {
      filterAllLabel = {
        ar: `كل ${parent.name_ar}`,
        en: `All ${parent.name_en}`,
      };
    }
  } else if (subCollections.length === 0) {
    // Top-level leaf with no children — show other top-level categories
    const topLevel = await getTopLevelCategoriesWithCounts();
    filterCollections = topLevel.filter((c) => c.slug !== collection.slug);
    filterAllHref = `/${locale}/categories`;
    filterAllLabel = {
      ar: "كل التشكيلات",
      en: "All categories",
    };
  }

  // Breadcrumb: Home / Categories / [Parent name (if any)] / [Current]
  const crumbs = [
    { href: `/${locale}`, label: locale === "ar" ? "الرئيسية" : "Home" },
    {
      href: `/${locale}/categories`,
      label: locale === "ar" ? "التشكيلات" : "Categories",
    },
  ];
  if (collection.parent_slug) {
    const parent = await getCollectionBySlug(collection.parent_slug);
    if (parent) {
      crumbs.push({
        href: `/${locale}/catalog/${parent.slug}`,
        label: locale === "ar" ? parent.name_ar : parent.name_en,
      });
    }
  }
  crumbs.push({
    href: `/${locale}/catalog/${collection.slug}`,
    label: locale === "ar" ? collection.name_ar : collection.name_en,
  });

  const products = await getProducts({
    collectionIds,
    sort,
    sizeInches,
    setOnly,
  });

  // Show the Compare CTA only on Milano (the design brief). Other
  // collections can opt in later by extending this allow-list; we keep
  // it explicit so a random collection doesn't surface an unhelpful
  // 1-product comparison table.
  const COMPARE_ENABLED = new Set(["milano-series"]);
  const compareHref =
    COMPARE_ENABLED.has(collection.slug) && products.length >= 2
      ? `/${locale}/catalog/${collection.slug}/compare`
      : undefined;

  // ─── JSON-LD ────────────────────────────────────────────────────
  const localizedName =
    locale === "ar" ? collection.name_ar : collection.name_en;
  const collectionDescription =
    (locale === "ar"
      ? collection.description_ar
      : collection.description_en) ?? localizedName;
  const pageSchemas = [
    collectionPageSchema({
      name: localizedName,
      description: collectionDescription,
      url: `/${locale}/catalog/${collection.slug}`,
      itemCount: products.length,
    }),
    breadcrumbSchema(
      (crumbs ?? []).map((c) => ({
        name: c.label,
        url: c.href,
      })),
    ),
  ];

  return (
    <>
      <JsonLd data={pageSchemas} />
      <CatalogView
        locale={locale}
        collections={filterCollections}
        products={products}
        activeCollection={collection}
        sort={sort}
        crumbs={crumbs}
        filterAllHref={filterAllHref}
        filterAllLabel={filterAllLabel}
        compareHref={compareHref}
        compareLabel={{
          ar: `قارن بين موديلات ${collection.name_ar}`,
          en: `Compare ${collection.name_en} models`,
        }}
      />
    </>
  );
}
