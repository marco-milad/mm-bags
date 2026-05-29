import { Check, CheckCircle2, MapPin, Package, ShoppingBag, Truck } from "lucide-react";
import type { Locale } from "@/lib/i18n-config";
import type { TrackingResult } from "@/lib/tracking/schema";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "confirmed", icon: ShoppingBag, ar: "تم تأكيد الطلب", en: "Order confirmed", emoji: "✅" },
  { key: "processing", icon: Package, ar: "جاري التجهيز", en: "Preparing", emoji: "📦" },
  { key: "shipped", icon: Truck, ar: "تم الشحن", en: "Shipped", emoji: "🚚" },
  { key: "out_for_delivery", icon: MapPin, ar: "الطرد في الطريق إليك", en: "Out for delivery", emoji: "🏃" },
  { key: "delivered", icon: CheckCircle2, ar: "تم التسليم", en: "Delivered", emoji: "🎉" },
] as const;

type StepKey = typeof STEPS[number]["key"];

function activeIndex(status: TrackingResult["status"]): number {
  // -1 = nothing started yet (status === pending or cancelled)
  if (status === "pending" || status === "cancelled") return -1;
  return STEPS.findIndex((s) => s.key === (status as StepKey));
}

export function TrackingTimeline({
  status,
  locale,
}: {
  status: TrackingResult["status"];
  locale: Locale;
}) {
  if (status === "cancelled") {
    return (
      <div className="rounded-xl border border-[var(--color-error)]/30 bg-[var(--color-error)]/5 p-5 text-sm text-[var(--color-error)]">
        {locale === "ar"
          ? "الطلب اتلغى. لو محتاج مساعدة كلمنا على واتساب."
          : "This order was cancelled. Contact us on WhatsApp if you need help."}
      </div>
    );
  }

  const current = activeIndex(status);

  return (
    <ol
      className="relative space-y-1"
      aria-label={locale === "ar" ? "حالة الطلب" : "Order status"}
    >
      {STEPS.map((step, i) => {
        const isDone = i < current;
        const isActive = i === current;
        const isFuture = i > current;
        const Icon = step.icon;

        return (
          <li key={step.key} className="relative flex gap-4 pb-6 last:pb-0">
            {/* Connector line down to next step (skip on last) */}
            {i < STEPS.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  "absolute top-10 h-full w-0.5 ltr:left-[18px] rtl:right-[18px]",
                  i < current ? "bg-[var(--color-success)]" : "bg-[var(--color-border)]",
                )}
              />
            )}

            {/* Icon dot */}
            <span
              className={cn(
                "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition",
                isDone && "bg-[var(--color-success)] text-white",
                isActive &&
                  "bg-[var(--color-accent)] text-[var(--color-primary)] ring-4 ring-[var(--color-accent)]/30",
                isFuture && "bg-[var(--color-surface)] text-[var(--color-text-secondary)]",
              )}
            >
              {isActive && (
                <span
                  aria-hidden
                  className="absolute inset-0 animate-ping rounded-full bg-[var(--color-accent)]/40"
                />
              )}
              {isDone ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
            </span>

            <div className="flex-1 pt-1.5">
              <p
                className={cn(
                  "text-sm font-semibold transition",
                  isActive && "text-[var(--color-text)]",
                  isDone && "text-[var(--color-text)]",
                  isFuture && "text-[var(--color-text-secondary)]",
                )}
              >
                {locale === "ar" ? step.ar : step.en} <span aria-hidden>{step.emoji}</span>
              </p>
              {isActive && (
                <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                  {locale === "ar" ? "في التقدم الآن" : "In progress"}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
