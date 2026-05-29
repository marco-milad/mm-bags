"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSizeGuideUxStore } from "@/store/size-guide-ux";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Calendar,
  CalendarDays,
  CalendarRange,
  Globe,
  Luggage,
  Plane,
  RotateCcw,
  Users,
  Weight,
} from "lucide-react";
import type { Locale } from "@/lib/i18n-config";
import { cn } from "@/lib/utils";
import {
  recommendSize,
  type PackingStyle,
  type SizeRecommendation,
  type TripLength,
  type TripType,
} from "@/lib/size-guide/recommend";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

const TRIP_LENGTH_OPTIONS = [
  { value: "1-3days", icon: Calendar, ar: "1–3 أيام", en: "1–3 days" },
  { value: "4-7days", icon: CalendarDays, ar: "4–7 أيام", en: "4–7 days" },
  { value: "1-2weeks", icon: CalendarRange, ar: "أسبوع لأسبوعين", en: "1–2 weeks" },
  { value: "2weeks+", icon: Plane, ar: "أكتر من أسبوعين", en: "More than 2 weeks" },
] as const satisfies readonly { value: TripLength; icon: typeof Calendar; ar: string; en: string }[];

const TRIP_TYPE_OPTIONS = [
  { value: "business", icon: Briefcase, ar: "شغل / عمل", en: "Business" },
  { value: "family", icon: Users, ar: "عائلة", en: "Family" },
  { value: "weekend", icon: Globe, ar: "ويك إند", en: "Weekend" },
] as const satisfies readonly { value: TripType; icon: typeof Briefcase; ar: string; en: string }[];

const PACKING_STYLE_OPTIONS = [
  { value: "light", icon: Luggage, ar: "بحاول أحاط", en: "I pack light" },
  { value: "heavy", icon: Weight, ar: "بحب آخد كل حاجة", en: "I bring everything" },
] as const satisfies readonly { value: PackingStyle; icon: typeof Luggage; ar: string; en: string }[];

type Step = 1 | 2 | 3 | 4;

export function SizeGuideModal({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [tripLength, setTripLength] = useState<TripLength | null>(null);
  const [tripType, setTripType] = useState<TripType | null>(null);
  const [packingStyle, setPackingStyle] = useState<PackingStyle | null>(null);

  // Signal completion to the floating-FAB pulse logic when the result step renders.
  const markCompleted = useSizeGuideUxStore((s) => s.markCompleted);
  useEffect(() => {
    if (step === 4) markCompleted();
  }, [step, markCompleted]);

  const reset = () => {
    setStep(1);
    setTripLength(null);
    setTripType(null);
    setPackingStyle(null);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      // Slight delay so the reset doesn't flash before the close animation.
      setTimeout(reset, 200);
    }
  };

  const isRTL = locale === "ar";
  const Back = isRTL ? ArrowRight : ArrowLeft;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent closeAriaLabel={locale === "ar" ? "إغلاق" : "Close"}>
        <header className="border-b border-[var(--color-border)] px-6 py-5">
          <DialogTitle className="font-display text-xl text-[var(--color-primary)]">
            {locale === "ar" ? "دليل المقاسات" : "Size guide"}
          </DialogTitle>
          <DialogDescription className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {locale === "ar"
              ? "3 أسئلة سريعة — نقولك المقاس المناسب."
              : "Three quick questions — we'll match you to the right size."}
          </DialogDescription>
          {step <= 3 && <StepDots current={step} />}
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {step === 1 && (
            <Question
              prompt={
                locale === "ar"
                  ? "كام يوم بتسافر عادةً؟"
                  : "How long is your usual trip?"
              }
            >
              <OptionGrid
                cols={2}
                options={TRIP_LENGTH_OPTIONS.map((o) => ({
                  value: o.value,
                  label: locale === "ar" ? o.ar : o.en,
                  Icon: o.icon,
                  selected: tripLength === o.value,
                }))}
                onSelect={(value) => {
                  setTripLength(value as TripLength);
                  setStep(2);
                }}
              />
            </Question>
          )}

          {step === 2 && (
            <Question
              prompt={
                locale === "ar" ? "نوع رحلتك إيه؟" : "What's the trip for?"
              }
            >
              <OptionGrid
                cols={3}
                options={TRIP_TYPE_OPTIONS.map((o) => ({
                  value: o.value,
                  label: locale === "ar" ? o.ar : o.en,
                  Icon: o.icon,
                  selected: tripType === o.value,
                }))}
                onSelect={(value) => {
                  setTripType(value as TripType);
                  setStep(3);
                }}
              />
            </Question>
          )}

          {step === 3 && (
            <Question
              prompt={
                locale === "ar"
                  ? "بتحب تحاط ولا تاخد أكتر؟"
                  : "Do you pack light or heavy?"
              }
            >
              <OptionGrid
                cols={2}
                options={PACKING_STYLE_OPTIONS.map((o) => ({
                  value: o.value,
                  label: locale === "ar" ? o.ar : o.en,
                  Icon: o.icon,
                  selected: packingStyle === o.value,
                }))}
                onSelect={(value) => {
                  setPackingStyle(value as PackingStyle);
                  setStep(4);
                }}
              />
            </Question>
          )}

          {step === 4 && tripLength && tripType && packingStyle && (
            <Result
              locale={locale}
              recommendation={recommendSize(tripLength, tripType, packingStyle)}
              onClose={() => handleOpenChange(false)}
              onReset={reset}
            />
          )}
        </div>

        {step > 1 && step < 4 && (
          <footer className="border-t border-[var(--color-border)] px-6 py-3">
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as Step)}
              className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] transition hover:text-[var(--color-text)]"
            >
              <Back className="h-4 w-4" />
              {locale === "ar" ? "السؤال السابق" : "Previous question"}
            </button>
          </footer>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StepDots({ current }: { current: number }) {
  return (
    <ol className="mt-4 flex items-center gap-1.5" aria-hidden>
      {[1, 2, 3].map((n) => (
        <li
          key={n}
          className={cn(
            "h-1.5 flex-1 rounded-full transition",
            n <= current ? "bg-[var(--color-primary)]" : "bg-[var(--color-border)]",
          )}
        />
      ))}
    </ol>
  );
}

function Question({
  prompt,
  children,
}: {
  prompt: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5">
      <h3 className="font-display text-xl text-[var(--color-text)]">{prompt}</h3>
      {children}
    </div>
  );
}

type Option = {
  value: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  selected: boolean;
};

function OptionGrid({
  cols,
  options,
  onSelect,
}: {
  cols: 2 | 3;
  options: Option[];
  onSelect: (value: string) => void;
}) {
  return (
    <div
      className={cn(
        "grid gap-2.5",
        cols === 2 ? "grid-cols-2" : "grid-cols-3",
      )}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onSelect(o.value)}
          className={cn(
            "flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium transition",
            o.selected
              ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)]"
              : "border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] hover:border-[var(--color-accent)]",
          )}
        >
          <o.Icon className="h-6 w-6" />
          <span className="text-center text-xs leading-tight">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

function Result({
  locale,
  recommendation,
  onClose,
  onReset,
}: {
  locale: Locale;
  recommendation: SizeRecommendation;
  onClose: () => void;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col gap-5 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-[var(--color-accent-dark)]">
        {locale === "ar" ? "ترشيحنا ليك" : "We recommend"}
      </p>
      <h3 className="font-display text-3xl text-[var(--color-primary)]">
        {locale === "ar" ? recommendation.label_ar : recommendation.label_en}
      </h3>
      <p className="mx-auto max-w-sm text-sm text-[var(--color-text-secondary)]">
        {locale === "ar" ? recommendation.reason_ar : recommendation.reason_en}
      </p>

      <div className="mt-2 flex flex-col gap-2">
        <Link
          href={`/${locale}/catalog${recommendation.filter}`}
          onClick={onClose}
          className="rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-light)]"
        >
          {locale === "ar" ? "اشتري دلوقتي" : "Shop now"}
        </Link>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center justify-center gap-1.5 text-xs text-[var(--color-text-secondary)] transition hover:text-[var(--color-text)]"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {locale === "ar" ? "إعادة الاختبار" : "Retake"}
        </button>
      </div>
    </div>
  );
}
