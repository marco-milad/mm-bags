import Link from "next/link";
import { notFound } from "next/navigation";
import { hasLocale } from "@/lib/i18n-config";
import {
  absoluteUrl,
  localeAlternates,
} from "@/lib/seo/site";
import {
  breadcrumbSchema,
  productSchema,
} from "@/lib/seo/jsonld";
import { JsonLd } from "@/components/seo/JsonLd";
import { effectivePrice, totalStock } from "@/lib/catalog-shared";
import { getProductBySlug, getRelatedProducts } from "@/lib/queries/catalog";
import { ProductDetailLayout } from "@/components/product/ProductDetailLayout";
import { ProductCard } from "@/components/product/ProductCard";
import { ReviewsSection } from "@/components/reviews/ReviewsSection";
import { ReviewStars } from "@/components/reviews/ReviewStars";
import { getApprovedReviews, summarize } from "@/lib/queries/reviews";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/products/[slug]">) {
  const { locale, slug } = await params;
  if (!hasLocale(locale)) return {};
  const product = await getProductBySlug(slug);
  if (!product) return {};
  const name = locale === "ar" ? product.name_ar : product.name_en;
  const description =
    (locale === "ar" ? product.description_ar : product.description_en) ??
    undefined;
  const isAr = locale === "ar";
  const price = effectivePrice(product);
  // Dynamic OG image with product context (title + image + price)
  // served from the edge route at /api/og.
  const ogParams = new URLSearchParams({
    title: name,
    price: String(Math.round(price)),
  });
  if (product.images?.[0]) ogParams.set("image", product.images[0]);
  const ogUrl = `/api/og?${ogParams.toString()}`;
  return {
    title: `${name} | M.M Bags`,
    description: description?.slice(0, 155),
    alternates: localeAlternates(`/products/${slug}`),
    openGraph: {
      title: name,
      description: description?.slice(0, 155),
      url: absoluteUrl(`/${locale}/products/${slug}`),
      type: "website",
      locale: isAr ? "ar_EG" : "en_US",
      alternateLocale: isAr ? "en_US" : "ar_EG",
      images: [
        {
          url: ogUrl,
          width: 1200,
          height: 630,
          alt: name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: name,
      description: description?.slice(0, 155),
      images: [ogUrl],
    },
  };
}

export default async function ProductDetailPage({
  params,
}: PageProps<"/[locale]/products/[slug]">) {
  const { locale, slug } = await params;
  if (!hasLocale(locale)) notFound();

  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [related, reviewsForSummary] = await Promise.all([
    getRelatedProducts({
      excludeProductId: product.id,
      collectionId: product.collection?.id ?? null,
      limit: 4,
    }),
    getApprovedReviews(product.id, 200),
  ]);
  const summary = summarize(reviewsForSummary);

  const name = locale === "ar" ? product.name_ar : product.name_en;
  const collectionName =
    product.collection &&
    (locale === "ar"
      ? product.collection.name_ar
      : product.collection.name_en);
  const whatsappNumber =
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "+201229749608";

  // ─── JSON-LD: Product + BreadcrumbList ──────────────────────────
  const description =
    locale === "ar" ? product.description_ar : product.description_en;
  const breadcrumbItems: Array<{ name: string; url: string }> = [
    {
      name: locale === "ar" ? "الرئيسية" : "Home",
      url: `/${locale}`,
    },
    {
      name: locale === "ar" ? "المنتجات" : "Catalog",
      url: `/${locale}/catalog`,
    },
  ];
  if (product.collection && collectionName) {
    breadcrumbItems.push({
      name: collectionName,
      url: `/${locale}/catalog/${product.collection.slug}`,
    });
  }
  breadcrumbItems.push({
    name,
    url: `/${locale}/products/${product.slug}`,
  });
  const pdpSchemas = [
    productSchema({
      name,
      description: description ?? name,
      slug: product.slug,
      locale,
      images: product.images ?? [],
      price: effectivePrice(product),
      originalPrice: product.sale_price ? product.base_price : null,
      totalStock: totalStock(product),
      averageRating: summary.average,
      reviewCount: summary.total,
    }),
    breadcrumbSchema(breadcrumbItems),
  ];

  return (
    <article className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-12">
      <JsonLd data={pdpSchemas} />
      {/* Breadcrumb */}
      <nav
        className="mb-6 flex items-center gap-2 text-xs text-[var(--color-text-secondary)]"
        aria-label={locale === "ar" ? "مسار التنقل" : "Breadcrumb"}
      >
        <Link href={`/${locale}/catalog`} className="hover:text-[var(--color-text)]">
          {locale === "ar" ? "المنتجات" : "Shop"}
        </Link>
        {product.collection && (
          <>
            <span>/</span>
            <Link
              href={`/${locale}/catalog/${product.collection.slug}`}
              className="hover:text-[var(--color-text)]"
            >
              {collectionName}
            </Link>
          </>
        )}
      </nav>

      {/* Main grid — client wrapper owns the shared hovered-color state
          so a swatch in the buy-box can preview the matching image in
          the gallery without a global store. The header block stays
          server-rendered and is handed to the client wrapper as
          children. */}
      <ProductDetailLayout
        product={product}
        locale={locale}
        name={name}
        whatsappNumber={whatsappNumber}
        header={
          <header className="flex flex-col gap-2">
            {collectionName && (
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-[var(--color-accent-dark)]">
                {collectionName}
              </p>
            )}
            <h1 className="font-display text-3xl leading-tight md:text-4xl">{name}</h1>
            {locale === "ar" && product.name_en && (
              <p className="text-sm text-[var(--color-text-secondary)]">
                {product.name_en}
              </p>
            )}
            {summary.total > 0 && (
              <a
                href="#reviews"
                className="mt-1 inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
              >
                <ReviewStars value={summary.average} size="sm" />
                <span className="font-mono">
                  {summary.average.toFixed(1)}
                </span>
                <span>
                  ({summary.total} {locale === "ar" ? "تقييم" : summary.total > 1 ? "reviews" : "review"})
                </span>
              </a>
            )}
          </header>
        }
      />

      {/* Reviews */}
      <ReviewsSection
        productId={product.id}
        productSlug={product.slug}
        locale={locale}
      />

      {/* Related products */}
      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 font-display text-2xl md:text-3xl">
            {locale === "ar" ? "ممكن يعجبك كمان" : "You may also like"}
          </h2>
          <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {related.map((p) => (
              <li key={p.id}>
                {/* Related-products grid is 2-col mobile / 4-col md+
                    (no 3-col tablet step like the catalog uses). */}
                <ProductCard
                  product={p}
                  locale={locale}
                  sizes="(min-width: 768px) 25vw, 50vw"
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
