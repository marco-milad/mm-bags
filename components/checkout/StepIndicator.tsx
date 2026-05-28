import { Check } from "lucide-react";
import type { Locale } from "@/lib/i18n-config";
import { cn } from "@/lib/utils";

export type CheckoutStep = 1 | 2 | 3;

export function StepIndicator({
  current,
  locale,
}: {
  current: CheckoutStep;
  locale: Locale;
}) {
  const steps = [
    { id: 1, label_ar: "الشحن", label_en: "Shipping" },
    { id: 2, label_ar: "الدفع", label_en: "Payment" },
    { id: 3, label_ar: "المراجعة", label_en: "Review" },
  ] as const;

  return (
    <ol
      className="mb-8 flex items-center gap-2 text-sm"
      aria-label={locale === "ar" ? "مراحل الشراء" : "Checkout steps"}
    >
      {steps.map((step, i) => {
        const isDone = step.id < current;
        const isActive = step.id === current;
        return (
          <li key={step.id} className="flex flex-1 items-center gap-2">
            <span
              aria-current={isActive ? "step" : undefined}
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-xs font-semibold",
                isDone &&
                  "bg-[var(--color-success)] text-white",
                isActive &&
                  "bg-[var(--color-primary)] text-white ring-4 ring-[var(--color-primary)]/15",
                !isDone &&
                  !isActive &&
                  "bg-[var(--color-surface)] text-[var(--color-text-secondary)]",
              )}
            >
              {isDone ? <Check className="h-4 w-4" /> : step.id}
            </span>
            <span
              className={cn(
                "hidden whitespace-nowrap font-medium md:inline",
                isActive
                  ? "text-[var(--color-text)]"
                  : "text-[var(--color-text-secondary)]",
              )}
            >
              {locale === "ar" ? step.label_ar : step.label_en}
            </span>
            {i < steps.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  "h-px flex-1",
                  isDone
                    ? "bg-[var(--color-success)]"
                    : "bg-[var(--color-border)]",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
