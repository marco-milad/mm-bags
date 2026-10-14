import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { hasLocale } from "@/lib/i18n-config";
import { GUIDES, formatGuideDate } from "@/lib/guides";
import { localeAlternates } from "@/lib/seo/site";
import { PolicyHeader } from "@/components/policy/PolicyComponents";

export const revalidate = 3600;

export async function generateMetadata({ params }: PageProps<"/[locale]/guides">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(locale)) return {};
  const isAr = locale === "ar";
  return {
    title: isAr ? "أدلة شراء شنط السفر" : "Luggage buying guides",
    description: isAr
      ? "أدلة عملية من M.M Bags: مقاسات شنط السفر، مقاس شنطة الكابينة لكل شركة طيران، هارد ولا سوفت، وخامات الشنط."
      : "Practical guides from M.M Bags: suitcase sizes, cabin bag size by airline, hard-shell vs soft, and suitcase materials.",
    alternates: localeAlternates("/guides", locale),
  };
}

export default async function GuidesIndexPage({ params }: PageProps<"/[locale]/guides">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const isAr = locale === "ar";

  return (
    <div className="bg-[var(--color-bg)]">
      <PolicyHeader
        eyebrow={isAr ? "قبل ما تشتري" : "Before you buy"}
        title={isAr ? "أدلة الشراء" : "Buying guides"}
        subtitle={
          isAr
            ? "إجابات واضحة على أكتر الأسئلة اللي بتتسأل قبل شراء شنطة سفر."
            : "Straight answers to the questions people ask before buying a suitcase."
        }
        updated={isAr ? "كتبها ماركو ميلاد، M.M Bags" : "Written by Marco Milad, M.M Bags"}
      />
      <ul className="mx-auto grid max-w-3xl gap-4 px-4 pb-20 md:grid-cols-2 md:px-6 md:pb-24">
        {GUIDES.map((g) => (
          <li key={g.slug}>
            <Link
              href={`/${locale}/guides/${g.slug}`}
              className="flex h-full flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition hover:border-[var(--color-accent)]"
            >
              <h2 className="font-serif text-xl leading-snug text-[var(--color-text)]">
                {isAr ? g.title.ar : g.title.en}
              </h2>
              <p className="mt-2 flex-1 text-sm leading-6 text-[var(--color-text-secondary)]">
                {isAr ? g.description.ar : g.description.en}
              </p>
              <p className="mt-4 text-xs text-[var(--color-text-secondary)]">
                {isAr ? "آخر تحديث: " : "Updated "}
                {formatGuideDate(g.updated, locale)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
