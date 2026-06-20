"use client";

import { Printer, X } from "lucide-react";
import type { AdminLocale } from "@/lib/admin/locale";
import { formatPriceEGP } from "@/lib/utils";

/**
 * Return-receipt modal. Mirror of `Receipt.tsx` but tuned for an
 * EXIT (refund) transaction:
 *   - Title is "إيصال إرجاع" / "Return Receipt".
 *   - Every qty is shown prefixed with a minus sign.
 *   - Every monetary value is shown as a negative number.
 *   - References back to the original sale_number for the audit.
 *
 * Shares the `#pos-receipt-print` id so the same print stylesheet
 * (defined in globals.css under @media print) isolates and prints
 * just this content. Reusing the id is safe — only one receipt
 * modal is ever mounted at a time.
 */
export function ReturnReceipt({
  saleNumber,
  returnedAt,
  cashierName,
  reason,
  refundMethod,
  items,
  refundAmount,
  notes,
  locale,
  onClose,
}: {
  saleNumber: string;
  returnedAt: string;
  cashierName: string | null;
  /** Already-localized reason label (see returnReasonLabel). */
  reason: string;
  /** Already-localized refund method label. */
  refundMethod: string;
  items: Array<{
    name: string;
    qty: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  refundAmount: number;
  notes: string | null;
  locale: AdminLocale;
  onClose: () => void;
}) {
  const isAr = locale === "ar";
  const dateLabel = new Date(returnedAt).toLocaleString(
    isAr ? "ar-EG" : "en-US",
    { dateStyle: "medium", timeStyle: "short" },
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isAr ? "إيصال الإرجاع" : "Return receipt"}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-[var(--color-bg)] shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label={isAr ? "إغلاق" : "Close"}
          className="absolute end-3 top-3 rounded-full p-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Receipt body — id used by the print stylesheet to isolate. */}
        <div
          id="pos-receipt-print"
          className="max-h-[80vh] overflow-y-auto p-6"
        >
          <header className="border-b border-dashed border-[var(--color-border)] pb-3 text-center">
            <p className="font-display text-xl text-[var(--color-text)]">
              M.M Bags
            </p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--color-error)]">
              {isAr ? "إيصال إرجاع" : "Return Receipt"}
            </p>
            <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
              {isAr ? "مرجع البيعة الأصلية: " : "Original sale: "}
              <span className="font-mono">{saleNumber}</span>
            </p>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {dateLabel}
            </p>
          </header>

          <ul className="my-3 divide-y divide-dashed divide-[var(--color-border)] text-sm">
            {items.map((line, idx) => (
              <li
                key={`${line.name}-${idx}`}
                className="grid grid-cols-[1fr_auto] gap-x-3 py-2"
              >
                <span className="text-[var(--color-text)]">
                  {line.name}
                  <span className="block font-mono text-[11px] text-[var(--color-error)]">
                    -{line.qty} × {formatPriceEGP(line.unitPrice)}
                  </span>
                </span>
                <span className="self-start font-mono text-sm text-[var(--color-error)]">
                  -{formatPriceEGP(line.lineTotal)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="border-t border-dashed border-[var(--color-border)] pt-3 text-sm">
            <Row label={isAr ? "السبب" : "Reason"} value={reason} />
            <Row
              label={isAr ? "طريقة الاسترداد" : "Refund method"}
              value={refundMethod}
            />
            <Row
              label={isAr ? "إجمالي الاسترداد" : "Refund total"}
              value={`-${formatPriceEGP(refundAmount)}`}
              strong
              error
            />
            {notes && (
              <Row
                label={isAr ? "ملاحظات" : "Notes"}
                value={notes}
              />
            )}
          </dl>

          {cashierName && (
            <p className="mt-4 border-t border-dashed border-[var(--color-border)] pt-3 text-center text-[11px] text-[var(--color-text-secondary)]">
              {isAr ? "تم الإرجاع بواسطة: " : "Returned by: "}
              {cashierName}
            </p>
          )}

          <p className="mt-4 text-center text-xs text-[var(--color-text-secondary)]">
            {isAr
              ? "احتفظ بالإيصال ده كإثبات للإرجاع."
              : "Keep this receipt as proof of the return."}
          </p>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--color-border)] px-4 py-1.5 text-xs font-medium text-[var(--color-text)] transition hover:border-[var(--color-accent)]"
          >
            {isAr ? "إغلاق" : "Close"}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary)] px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--color-primary)]/90"
          >
            <Printer className="h-3.5 w-3.5" />
            {isAr ? "طباعة" : "Print"}
          </button>
        </footer>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
  error,
}: {
  label: string;
  value: string;
  strong?: boolean;
  error?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <dt className="text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
        {label}
      </dt>
      <dd
        className={[
          "text-sm",
          strong ? "font-semibold" : "",
          error
            ? "font-mono text-[var(--color-error)]"
            : "text-[var(--color-text)]",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {value}
      </dd>
    </div>
  );
}
