import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "@/lib/i18n-config";
import {
  localeAlternates,
  SITE_DESCRIPTION_AR,
  SITE_DESCRIPTION_EN,
  SITE_URL,
} from "@/lib/seo/site";
import {
  organizationSchema,
  websiteSchema,
} from "@/lib/seo/jsonld";
import { JsonLd } from "@/components/seo/JsonLd";
import { Hero } from "@/components/home/Hero";
import { Marquee } from "@/components/home/Marquee";
import { CollectionsSection } from "@/components/home/CollectionsSection";
import { FounderMoment } from "@/components/home/FounderMoment";
import { BestSellersCarousel } from "@/components/home/BestSellersCarousel";
import { MoodBoard } from "@/components/home/MoodBoard";
import { VideosStrip } from "@/components/home/VideosStrip";
import { StatsStrip } from "@/components/home/StatsStrip";
import { PromiseSection } from "@/components/home/PromiseSection";
import { ReviewsReel } from "@/components/home/ReviewsReel";
import { FeaturedProduct } from "@/components/home/FeaturedProduct";
import { ShopByMaterial } from "@/components/home/ShopByMaterial";
import { NewsletterPanel } from "@/components/home/NewsletterPanel";
import {
  getFeaturedProduct,
  getMaterialCounts,
  getFeaturedHomepageProductsFlat,
} from "@/lib/queries/catalog";
import { getTopLevelCategoriesWithCounts } from "@/lib/queries/categories";
import { getFeaturedReviews } from "@/lib/queries/reviews";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const isAr = locale === "ar";
  return {
    title: isAr
      ? "M.M Bags — شنط سفر بجودة عالية | Cairo, Egypt"
      : "M.M Bags — Premium travel & everyday bags | Cairo, Egypt",
    description: isAr ? SITE_DESCRIPTION_AR : SITE_DESCRIPTION_EN,
    alternates: localeAlternates("/"),
    openGraph: {
      title: isAr ? "M.M Bags — شنط سفر بجودة عالية" : "M.M Bags",
      description: isAr ? SITE_DESCRIPTION_AR : SITE_DESCRIPTION_EN,
      url: `${SITE_URL}/${locale}`,
      type: "website",
      locale: isAr ? "ar_EG" : "en_US",
      alternateLocale: isAr ? "en_US" : "ar_EG",
      images: ["/api/og"],
    },
  };
}

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();

  const [categories, bestSellers, homeReviews, featuredProduct, materials] =
    await Promise.all([
      getTopLevelCategoriesWithCounts(),
      getFeaturedHomepageProductsFlat(),
      getFeaturedReviews(6),
      getFeaturedProduct(),
      getMaterialCounts(),
    ]);

  return (
    <>
      <JsonLd data={[organizationSchema(), websiteSchema()]} />
      <Hero
        locale={locale}
        taglineAr="سافر بذكاء. سافر بأناقة."
        taglineEn="Travel Smart. Travel in Style."
      />

      {/* Anchor for the scroll cue */}
      <div id="after-hero" />

      <Marquee locale={locale} />

      <CollectionsSection locale={locale} categories={categories} />

      <FounderMoment locale={locale} />

      {bestSellers.length > 0 && (
        <BestSellersCarousel locale={locale} products={bestSellers} />
      )}

      <MoodBoard locale={locale} />

      <VideosStrip locale={locale} />

      <StatsStrip locale={locale} />

      <PromiseSection locale={locale} />

      {homeReviews.length > 0 && (
        <ReviewsReel locale={locale} reviews={homeReviews} />
      )}

      {featuredProduct && (
        <FeaturedProduct locale={locale} product={featuredProduct} />
      )}

      <ShopByMaterial locale={locale} materials={materials} />

      <NewsletterPanel locale={locale} />
    </>
  );
}
