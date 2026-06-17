"use client";

import { Loader2, Minus, Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { adjustStock } from "@/lib/admin/stock-actions";
import type { AdminLocale } from "@/lib/admin/locale";

/**
 * Quick +/- stock adjustment with an optional reason prompt. Used in
 * the /admin/stock current-stock tab next to each variant row.
 */
export function AdjustButton({
  variantId,
  delta,
  locale,
}: {
  variantId: string;
  delta: number;
  locale: AdminLocale;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isAr = locale === "ar";

  function handle() {
    setError(null);
    startTransition(async () => {
      const promptMsg =
        delta < 0
          ? isAr
            ? "سبب الخصم:"
            : "Reason for write-off:"
          : isAr
            ? "سبب الإضافة (اختياري):"
            : "Reason for restock (optional):";
      const reason = window.prompt(promptMsg) ?? undefined;
      const res = await adjustStock({ variantId, delta, reason });
      if (!res.ok) setError(res.error);
    });
  }

  const Icon = delta < 0 ? Minus : Plus;
  const ariaLabel =
    delta < 0
      ? isAr
        ? "نقص المخزون"
        : "Decrease stock"
      : isAr
        ? "زيادة المخزون"
        : "Increase stock";
  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      <button
        type="button"
        onClick={handle}
        disabled={pending}
        aria-label={ariaLabel}
        className="grid h-7 w-7 place-items-center rounded-md border border-[var(--color-border)] text-[var(--color-text-secondary)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-text)] disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Icon className="h-3.5 w-3.5" />
        )}
      </button>
      {error && (
        <span className="max-w-[140px] truncate text-[10px] text-[var(--color-error)]">
          {error}
        </span>
      )}
    </span>
  );
}
