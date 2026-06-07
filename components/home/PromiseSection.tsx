import {
  Headphones,
  HandHeart,
  ShieldCheck,
  Tag,
  type LucideIcon,
} from "lucide-react";
import type { Locale } from "@/lib/i18n-config";
import { Reveal } from "@/components/shared/Reveal";

type Promise = {
  icon: LucideIcon;
  ar_title: string; ar_copy: string;
  en_title: string; en_copy: string;
};

const PROMISES: Promise[] = [
  {
    icon: HandHeart,
    ar_title: "جودة حقيقية",
    ar_copy: "كل شنطة بنختارها ونجربها بإيدنا قبل ما تطلع للبيع.",
    en_title: "Real quality",
    en_copy: "Every bag we sell is hand-picked and tested by us.",
  },
  {
    icon: Tag,
    ar_title: "سعر عادل",
    ar_copy: "بنشتري مباشرة من المصنّع — بدون وسطاء ولا أسعار مبالغ فيها.",
    en_title: "Fair price",
    en_copy: "We source direct from makers — no middlemen, no inflated prices.",
  },
  {
    icon: ShieldCheck,
    ar_title: "ضمان ١٤ يوم",
    ar_copy: "أي مشكلة في الجودة — استبدال أو استرداد خلال ١٤ يوم.",
    en_title: "14-day guarantee",
    en_copy: "Any quality issue — full exchange or refund within 14 days.",
  },
  {
    icon: Headphones,
    ar_title: "دعم ٢٤/٧",
    ar_copy: "كلّمنا على واتساب أي وقت — بنرد بسرعة وبشكل شخصي.",
    en_title: "24/7 support",
    en_copy: "WhatsApp us anytime — we reply quickly and personally.",
  },
];

/**
 * Numbered 01–04 promise grid per the COMPONENTS spec.
 * Cormorant brass numerals, Lucide navy icons, Jost copy.
 * Divider rules between items on desktop (subtle hairlines).
 */
export function PromiseSection({ locale }: { locale: Locale }) {
  return (
    <section className="bg-paper py-12 md:py-24">
      <div className="mx-auto max-w-[1200px] px-6 md:px-12">
        <header className="mb-12 flex flex-col gap-2 md:mb-16">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-brass-700">
            {locale === "ar" ? "وعدنا ليك" : "Our promise"}
          </p>
          <h2 className="font-display text-3xl text-navy-900 md:text-4xl">
            {locale === "ar" ? "وعد M.M Bags" : "The M.M Promise"}
          </h2>
        </header>

        <ul className="grid grid-cols-1 divide-y divide-line border-y border-line md:grid-cols-4 md:divide-x md:divide-y-0 rtl:md:divide-x-reverse">
          {PROMISES.map((p, i) => {
            const Icon = p.icon;
            return (
              <Reveal key={i} as="li" delay={i * 80}>
                <div className="flex h-full flex-col gap-3 px-2 py-8 md:px-6">
                  <span className="font-display text-2xl font-medium text-brass-500 tabular">
                    0{i + 1}
                  </span>
                  <Icon
                    className="h-6 w-6 text-navy-700"
                    strokeWidth={1.75}
                  />
                  <h3 className="text-base font-semibold text-navy-900">
                    {locale === "ar" ? p.ar_title : p.en_title}
                  </h3>
                  <p className="text-sm leading-relaxed text-ink-500">
                    {locale === "ar" ? p.ar_copy : p.en_copy}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
