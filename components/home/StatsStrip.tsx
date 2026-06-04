import type { Locale } from "@/lib/i18n-config";
import { AnimatedCounter } from "@/components/about/AnimatedCounter";

type Stat = {
  value: number;
  suffix?: string;
  decimals?: number;
  label_ar: string;
  label_en: string;
};

const STATS: Stat[] = [
  { value: 27,     label_ar: "محافظة بنوصلها",     label_en: "Governorates"     },
  { value: 12_000, suffix: "+", label_ar: "رحلة سفر",       label_en: "Trips"      },
  { value: 4.8,    decimals: 1, label_ar: "نجوم تقييم",     label_en: "★ rating"   },
  { value: 14,     label_ar: "يوم ضمان استبدال", label_en: "Day guarantee"      },
];

/**
 * Brass-tinted strip with 4 count-up stats. Counters fire when scrolled into
 * view via IntersectionObserver (see AnimatedCounter). Hairline brass rules
 * above + below per the spec ("brass hardware accent").
 */
export function StatsStrip({ locale }: { locale: Locale }) {
  return (
    <section className="relative bg-brass-100/40">
      <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-brass-500/30" />
      <span aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-brass-500/30" />

      <ul className="mx-auto grid max-w-[1200px] grid-cols-2 gap-y-10 px-6 py-14 md:grid-cols-4 md:px-12 md:py-16">
        {STATS.map((s, i) => (
          <li
            key={i}
            className="flex flex-col items-center gap-1.5 text-center md:gap-2"
          >
            <p className="font-display text-5xl text-navy-900 md:text-6xl tabular">
              <AnimatedCounter
                target={s.value}
                suffix={s.suffix}
                decimals={s.decimals}
              />
            </p>
            <p className="text-xs uppercase tracking-wider text-ink-500 md:text-sm">
              {locale === "ar" ? s.label_ar : s.label_en}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
