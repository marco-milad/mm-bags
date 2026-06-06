import { notFound } from "next/navigation";
import { hasLocale } from "@/lib/i18n-config";
import { SizeGuideBanner } from "@/components/size-guide/SizeGuideBanner";
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
import { NewsletterPanel } from "@/components/home/NewsletterPanel";
import { getProducts } from "@/lib/queries/catalog";
import { getTopLevelCategoriesWithCounts } from "@/lib/queries/categories";
import { getFeaturedReviews } from "@/lib/queries/reviews";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();

  const [categories, bestSellers, homeReviews] = await Promise.all([
    getTopLevelCategoriesWithCounts(),
    getProducts({ tag: "best-seller", limit: 8 }),
    getFeaturedReviews(3),
  ]);

  return (
    <>
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

      <SizeGuideBanner locale={locale} />

      <NewsletterPanel locale={locale} />
    </>
  );
}
