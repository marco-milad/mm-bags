"use client";

import { Check, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { setStock } from "@/lib/admin/stock-actions";
import type { AdminLocale } from "@/lib/admin/locale";

/**
 * Exact-quantity cell for the /admin/stock current-stock tab.
 *
 * Sits where the read-only stock number used to be. Type the count and
 * press Enter (or the tick) and the variant lands on that number — the
 * +/- buttons beside it stay for single-unit corrections.
 *
 * `key`ed on the server value by the caller, so a save that lands a
 * different number than typed (or a change from elsewhere) re-mounts
 * the field with the truth rather than leaving a stale local edit.
 */
export function SetStockField({
  variantId,
  qty,
  locale,
}: {
  variantId: string;
  qty: number;
  locale: AdminLocale;
}) {
  const isAr = locale === "ar";
  const [value, setValue] = useState(String(qty));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Digits only, and never an empty field. `Number("")` is 0, not NaN —
  // so a laxer check turns "cleared the box to retype" into "took this
  // variant out of stock", which is the one mistake this screen must not
  // make quietly. Same reason `1e3` and `-2` are rejected rather than
  // coerced.
  const trimmed = value.trim();
  const valid = /^\d+$/.test(trimmed);
  const parsed = valid ? Number(trimmed) : NaN;
  const dirty = valid && parsed !== qty;
  const zeroing = dirty && parsed === 0;

  function save() {
    if (!dirty) return;
    setError(null);
    // Going to zero is the change shoppers see, so it gets named out
    // loud instead of hiding behind the reason prompt.
    if (
      zeroing &&
      !window.confirm(
        isAr
          ? "تصفير المخزون؟ المنتج هيظهر \"غير متوفر\" في المتجر."
          : "Set stock to 0? The product will show as out of stock on the storefront.",
      )
    ) {
      setValue(String(qty));
      return;
    }
    startTransition(async () => {
      const reason =
        window.prompt(
          isAr ? "سبب التغيير (اختياري):" : "Reason for the change (optional):",
        ) ?? undefined;
      const res = await setStock({ variantId, qty: parsed, reason });
      if (!res.ok) {
        setError(res.error);
        setValue(String(qty));
      }
    });
  }

  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      <span className="inline-flex items-center gap-1">
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={value}
          disabled={pending}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              save();
            }
            if (e.key === "Escape") setValue(String(qty));
          }}
          aria-label={isAr ? "الكمية" : "Quantity"}
          aria-invalid={trimmed !== "" && !valid}
          className="h-7 w-16 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2 text-end font-mono text-sm focus:border-[var(--color-accent)] focus:outline-none disabled:opacity-60 aria-[invalid=true]:border-[var(--color-error)]"
        />
        {/* Only offered once the typed number differs — keeps the row
            quiet until there is something to commit. */}
        {dirty && (
          <button
            type="button"
            onClick={save}
            disabled={pending}
            aria-label={isAr ? "حفظ الكمية" : "Save quantity"}
            className="grid h-7 w-7 place-items-center rounded-md border border-[var(--color-accent)] text-[var(--color-accent-dark)] transition hover:bg-[var(--color-accent)] hover:text-white disabled:opacity-60"
          >
            {pending ? (
              <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check aria-hidden className="h-3.5 w-3.5" />
            )}
          </button>
        )}
      </span>
      {error && (
        <span className="max-w-[140px] text-end text-[10px] leading-tight text-[var(--color-error)]">
          {error}
        </span>
      )}
    </span>
  );
}
