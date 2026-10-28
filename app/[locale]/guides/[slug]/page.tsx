import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, locales } from "@/lib/i18n-config";
import { GUIDES, getGuide } from "@/lib/guides";
import { articleSchema, breadcrumbSchema, faqSchema } from "@/lib/seo/jsonld";
import { absoluteUrl, localeAlternates } from "@/lib/seo/site";
import { JsonLd } from "@/components/seo/JsonLd";
import { GuideArticle } from "@/components/guides/GuideArticle";

// Static with hourly ISR, like the policy pages: the content is in the repo;
// only the layout's navigation reads the DB.
export const revalidate = 3600;
// Only the guides in lib/guides exist; anything else is a real 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return locales.flatMap((locale) => GUIDES.map((g) => ({ locale, slug: g.slug })));
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/guides/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const guide = getGuide(slug);
  if (!hasLocale(locale) || !guide) return {};
  const isAr = locale === "ar";
  return {
    title: isAr ? guide.title.ar : guide.title.en,
    description: isAr ? guide.description.ar : guide.description.en,
    alternates: localeAlternates(`/guides/${slug}`, locale),
    // A page-level openGraph replaces the layout's whole object, so the
    // share image and url have to be restated here or links share bare.
    openGraph: {
      type: "article",
      modifiedTime: guide.updated,
      publishedTime: guide.published,
      url: absoluteUrl(`/${locale}/guides/${slug}`),
      images: ["/api/og"],
    },
  };
}

export default async function GuidePage({ params }: PageProps<"/[locale]/guides/[slug]">) {
  const { locale, slug } = await params;
  const guide = getGuide(slug);
  if (!hasLocale(locale) || !guide) notFound();
  const isAr = locale === "ar";
  const path = `/${locale}/guides/${slug}`;

  return (
    <>
      <JsonLd
        data={[
          articleSchema({
            headline: isAr ? guide.title.ar : guide.title.en,
            description: isAr ? guide.description.ar : guide.description.en,
            url: path,
            locale,
            datePublished: guide.published,
            dateModified: guide.updated,
          }),
          faqSchema(guide.faq.map((f) => ({ question: isAr ? f.q.ar : f.q.en, answer: isAr ? f.a.ar : f.a.en }))),
          breadcrumbSchema([
            { name: isAr ? "الرئيسية" : "Home", url: `/${locale}` },
            { name: isAr ? "أدلة الشراء" : "Buying guides", url: `/${locale}/guides` },
            { name: isAr ? guide.title.ar : guide.title.en, url: path },
          ]),
        ]}
      />
      <GuideArticle guide={guide} locale={locale} />
    </>
  );
}
