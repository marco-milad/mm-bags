"use client";

import { useId, useState, useTransition } from "react";
import { Check, Loader2, TicketPercent, X } from "lucide-react";
import type { Locale } from "@/lib/i18n-config";
import { checkCoupon } from "@/lib/coupons/actions";
import { COUPON_INPUT_MAX, couponRejectionText } from "@/lib/coupons/code";

export type AppliedCoupon = { code: string; percentOff: number };

/**
 * "Have a discount code?" on the Review step. The check here is a preview
 * for the totals; placeOrder validates and redeems the code again.
 */
export function CouponField({
  locale,
  applied,
  onChange,
  disabled,
}: {
  locale: Locale;
  applied: AppliedCoupon | null;
  onChange: (c: AppliedCoupon | null) => void;
  disabled?: boolean;
}) {
  const isAr = locale === "ar";
  const inputId = useId();
  const errorId = useId();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const apply = () => {
    if (!value.trim()) return;
    setError(null);
    startTransition(async () => {
      const r = await checkCoupon(value);
      if (r.ok) {
        onChange({ code: r.code, percentOff: r.percentOff });
        setValue("");
      } else {
        setError(couponRejectionText(r.reason, isAr));
      }
    });
  };

  if (applied) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-success)]/40 bg-[var(--color-success)]/10 px-4 py-3 text-sm">
        <p className="flex items-center gap-2 text-[var(--color-success)]">
          <Check className="h-4 w-4 shrink-0" />
          <span>
            {isAr ? "كود الخصم" : "Code"} <span dir="ltr" className="font-mono font-semibold">{applied.code}</span>{" "}
            {isAr ? `— خصم ${applied.percentOff}٪ على المنتجات` : `— ${applied.percentOff}% off products`}
          </span>
        </p>
        <button
          type="button"
          onClick={() => onChange(null)}
          disabled={disabled}
          aria-label={isAr ? "شيل كود الخصم" : "Remove discount code"}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg)] hover:text-[var(--color-text)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
      <label htmlFor={inputId} className="flex items-center gap-2 text-sm font-medium text-[var(--color-text)]">
        <TicketPercent className="h-4 w-4 text-[var(--color-accent-dark)]" />
        {isAr ? "معاك كود خصم؟" : "Have a discount code?"}
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id={inputId}
          type="text"
          dir="ltr"
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          maxLength={COUPON_INPUT_MAX}
          placeholder="MM-XXXXXX"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            // Enter applies the code instead of submitting the order.
            if (e.key === "Enter") {
              e.preventDefault();
              apply();
            }
          }}
          disabled={disabled || isPending}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className="min-w-0 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 font-mono text-sm uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        />
        <button
          type="button"
          onClick={apply}
          disabled={disabled || isPending || !value.trim()}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-[var(--color-primary)] px-4 text-sm font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)] hover:text-white disabled:opacity-50"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {isAr ? "تطبيق" : "Apply"}
        </button>
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-2 text-xs text-[var(--color-error)]">
          {error}
        </p>
      )}
    </div>
  );
}
