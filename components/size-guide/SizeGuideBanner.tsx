import { Ruler, Sparkles } from "lucide-react";
import type { Locale } from "@/lib/i18n-config";
import { SizeGuideModalLazy } from "./SizeGuideModalLazy";

export function SizeGuideBanner({ locale }: { locale: Locale }) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-10 md:px-12">
      <div className="grid gap-6 overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-light)] p-8 text-white md:grid-cols-[1fr_auto] md:items-center md:p-10">
        <div className="flex flex-col gap-3">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-[var(--color-accent-light)]">
            <Sparkles className="h-3 w-3" />
            {locale === "ar" ? "ذكي وسريع" : "Smart & quick"}
          </span>
          <h2 className="font-display text-2xl md:text-3xl">
            {locale === "ar"
              ? "مش عارف تختار المقاس المناسب؟"
              : "Not sure which size to pick?"}
          </h2>
          <p className="max-w-md text-sm text-white/80">
            {locale === "ar"
              ? "جاوب على 3 أسئلة سريعة، وهنرشحلك الشنطة اللي بتناسب رحلتك."
              : "Answer 3 quick questions and we'll match you to the right luggage."}
          </p>
        </div>

        <SizeGuideModalLazy locale={locale}>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-[var(--color-primary)] shadow-lg shadow-black/20 transition hover:bg-[var(--color-accent-light)]"
          >
            <Ruler className="h-4 w-4" />
            {locale === "ar" ? "ابدأ الاختبار" : "Take the quiz"}
          </button>
        </SizeGuideModalLazy>
      </div>
    </section>
  );
}
