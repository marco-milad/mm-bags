"use client";

import { Layers, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { setManyStock } from "@/lib/admin/stock-actions";
import type { AdminLocale } from "@/lib/admin/locale";

/**
 * "Set every listed variant to N" bar above the current-stock table.
 *
 * Pairs with the filter bar: narrow the table to a collection (or a
 * search) and the whole set takes one number. That is the difference
 * between taking a collection out of stock in one action and clicking
 * through every colour and size of every product in it.
 *
 * It acts on the ids it was handed — the rows actually on screen — so
 * the confirm prompt can state a count the operator can verify.
 */
export function BulkSetStock({
  variantIds,
  locale,
}: {
  variantIds: string[];
  locale: AdminLocale;
}) {
  const isAr = locale === "ar";
  const [value, setValue] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  // Digits only — see the note in SetStockField on why `Number()` alone
  // is not a safe gate for a quantity box.
  const trimmed = value.trim();
  const valid = /^\d+$/.test(trimmed);
  const parsed = valid ? Number(trimmed) : NaN;
  const count = variantIds.length;

  function apply() {
    if (!valid || count === 0) return;
    setError(null);
    setDone(null);
    const confirmMsg = isAr
      ? `تعيين ${count} فاريانت على الكمية ${parsed}؟`
      : `Set ${count} variant${count === 1 ? "" : "s"} to ${parsed}?`;
    if (!window.confirm(confirmMsg)) return;
    const reason =
      window.prompt(
        isAr ? "سبب التغيير (اختياري):" : "Reason for the change (optional):",
      ) ?? undefined;
    startTransition(async () => {
      const res = await setManyStock({ variantIds, qty: parsed, reason });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setValue("");
      setDone(
        isAr
          ? `تم تعديل ${res.changed} فاريانت${res.skipped ? ` · ${res.skipped} كانت على نفس الكمية` : ""}.`
          : `${res.changed} variant${res.changed === 1 ? "" : "s"} updated${res.skipped ? ` · ${res.skipped} already at that number` : ""}.`,
      );
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
      <Layers
        aria-hidden
        className="h-4 w-4 shrink-0 text-[var(--color-text-secondary)]"
      />
      <span className="text-xs text-[var(--color-text-secondary)]">
        {isAr
          ? `تعيين كل الـ ${count} فاريانت الظاهرة على:`
          : `Set all ${count} listed variant${count === 1 ? "" : "s"} to:`}
      </span>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={value}
        disabled={pending || count === 0}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            apply();
          }
        }}
        placeholder={isAr ? "كمية" : "Qty"}
        aria-label={isAr ? "الكمية الجديدة" : "New quantity"}
        className="h-8 w-20 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2 text-end font-mono text-sm focus:border-[var(--color-accent)] focus:outline-none disabled:opacity-60"
      />
      <button
        type="button"
        onClick={apply}
        disabled={!valid || pending || count === 0}
        className="inline-flex items-center gap-1.5 rounded-md bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white transition disabled:opacity-50"
      >
        {pending && <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />}
        {isAr ? "تطبيق على الكل" : "Apply to all"}
      </button>
      {/* 0 is the out-of-stock case and the one worth naming outright,
          since it is what shoppers see change. */}
      <span className="text-[10px] text-[var(--color-text-secondary)]">
        {isAr
          ? "الكمية 0 = غير متوفر في المتجر"
          : "0 = out of stock on the storefront"}
      </span>
      {error && (
        <span className="text-[11px] text-[var(--color-error)]">{error}</span>
      )}
      {done && (
        <span className="text-[11px] text-[var(--color-success)]">{done}</span>
      )}
    </div>
  );
}
