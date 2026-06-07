import Link from "next/link";
import { notFound } from "next/navigation";
import { hasLocale } from "@/lib/i18n-config";
import { getProductBySlug, getRelatedProducts } from "@/lib/queries/catalog";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductActions } from "@/components/product/ProductActions";
import { ProductAccordion } from "@/components/product/ProductAccordion";
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
  return {
    title: name,
    description: description?.slice(0, 155),
    openGraph: {
      title: name,
      description: description?.slice(0, 155),
      images: product.images?.[0]
        ? [{ url: product.images[0], width: 1200, height: 1200 }]
        : undefined,
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
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "+201000000000";

  return (
    <article className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-12">
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

      {/* Main grid */}
      <div className="grid gap-8 md:grid-cols-2 md:gap-12">
        <ProductGallery
          images={product.images}
          name={name}
          locale={locale}
          imageFit={product.image_fit}
          imageAspect={product.image_aspect}
        />

        <div className="flex flex-col gap-6">
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

          <ProductActions
            product={product}
            locale={locale}
            whatsappNumber={whatsappNumber}
          />

          <ProductAccordion product={product} locale={locale} />
        </div>
      </div>

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
