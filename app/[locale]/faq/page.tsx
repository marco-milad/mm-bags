import { notFound } from "next/navigation";
import { hasLocale } from "@/lib/i18n-config";
import { FAQContent } from "@/components/faq/FAQContent";

export const metadata = {
  title: "FAQ — M.M Bags",
  description:
    "الأسئلة الشائعة عن M.M Bags: الشحن والتوصيل، الدفع، الإرجاع والضمان، المنتجات، والطلبات.",
};

/**
 * Server-rendered hero + a client subtree (FAQContent) that owns search,
 * tab state, and accordion open/close. The Q&A markup itself is still in
 * the SSR HTML — see FAQContent for the SEO note.
 */
export default async function FAQPage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();

  const isRTL = locale === "ar";

  return (
    <div className="bg-[var(--color-bg)]">
      {/* Hero */}
      <header className="mx-auto max-w-3xl px-4 pt-14 pb-8 text-center md:px-6 md:pt-20 md:pb-12">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--color-accent-dark)]">
          {isRTL ? "ساعدنا" : "Help center"}
        </p>
        <h1 className="mt-4 font-serif text-4xl text-[var(--color-text)] md:text-5xl">
          {isRTL ? "الأسئلة الشائعة" : "Frequently Asked Questions"}
        </h1>
        <p className="mt-3 text-sm text-[var(--color-text-secondary)] md:text-base">
          {isRTL
            ? "جمعنا أكتر الأسئلة اللي بتوصلنا — جاوبنا عليها هنا. مش لاقي إجابتك؟ تواصل معانا."
            : "We've gathered the questions we get most. Can't find yours? Reach out to us."}
        </p>
      </header>

      <FAQContent locale={locale} />
    </div>
  );
}
