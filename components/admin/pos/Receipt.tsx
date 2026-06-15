"use client";

import { Printer, X } from "lucide-react";
import type { CompleteSaleResult } from "@/lib/pos/actions";
import { formatPriceEGP } from "@/lib/utils";

type ReceiptSale = Extract<CompleteSaleResult, { ok: true }>["sale"];

/**
 * Post-sale receipt modal. Shows after `completeSale` succeeds.
 *
 * Print strategy: the receipt content is rendered into a hidden
 * `<div id="pos-receipt-print">` that the print stylesheet (defined
 * in globals.css under @media print) keeps visible while hiding
 * everything else. window.print() then captures the receipt only.
 *
 * The on-screen modal also styles the same content — DRY by reusing
 * the same component but flipping classes via `printable` prop.
 */
export function ReceiptModal({
  sale,
  onClose,
}: {
  sale: ReceiptSale;
  onClose: () => void;
}) {
  const dateLabel = new Date(sale.createdAt).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sale receipt"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-[var(--color-bg)] shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-full p-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Receipt body — id used by the print stylesheet to isolate. */}
        <div id="pos-receipt-print" className="max-h-[80vh] overflow-y-auto p-6">
          <header className="border-b border-dashed border-[var(--color-border)] pb-3 text-center">
            <p className="font-display text-xl text-[var(--color-text)]">
              M.M Bags
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--color-text-secondary)]">
              {sale.sale_number}
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              {dateLabel}
            </p>
            {sale.cashierName && (
              <p className="text-[11px] text-[var(--color-text-secondary)]">
                Cashier: {sale.cashierName}
              </p>
            )}
          </header>

          <ul className="my-3 divide-y divide-dashed divide-[var(--color-border)] text-sm">
            {sale.items.map((line) => (
              <li
                key={line.variantId}
                className="grid grid-cols-[1fr_auto] gap-x-3 py-2"
              >
                <span className="text-[var(--color-text)]">
                  {line.name}
                  {(line.color || line.size) && (
                    <span className="ms-1 text-[11px] text-[var(--color-text-secondary)]">
                      ·{" "}
                      {[line.color, line.size].filter(Boolean).join(" / ")}
                    </span>
                  )}
                  <span className="block font-mono text-[11px] text-[var(--color-text-secondary)]">
                    {line.qty} × {formatPriceEGP(line.unitPrice)}
                  </span>
                </span>
                <span className="self-start font-mono text-sm text-[var(--color-text)]">
                  {formatPriceEGP(line.lineTotal)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="border-t border-dashed border-[var(--color-border)] pt-3 text-sm">
            <Row label="Subtotal" value={formatPriceEGP(sale.subtotal)} />
            {sale.discount > 0 && (
              <Row label="Discount" value={`- ${formatPriceEGP(sale.discount)}`} />
            )}
            <Row
              label="Total"
              value={formatPriceEGP(sale.total)}
              strong
            />
            <Row label="Payment" value={prettyPayment(sale.paymentMethod)} />
            {sale.paymentRef && (
              <Row label="Ref" value={sale.paymentRef} mono />
            )}
          </dl>

          <p className="mt-5 text-center text-sm text-[var(--color-text)]">
            شكراً لتسوقك معنا 🧳
          </p>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--color-border)] px-4 py-1.5 text-xs font-medium text-[var(--color-text)] transition hover:border-[var(--color-accent)]"
          >
            New sale
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary)] px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--color-primary)]/90"
          >
            <Printer className="h-3.5 w-3.5" />
            Print
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
  mono,
}: {
  label: string;
  value: string;
  strong?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <dt className="text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
        {label}
      </dt>
      <dd
        className={[
          mono ? "font-mono text-xs" : "text-sm",
          strong ? "font-semibold text-[var(--color-text)]" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {value}
      </dd>
    </div>
  );
}

function prettyPayment(m: string): string {
  return (
    {
      cash: "Cash",
      "e-wallet": "E-wallet",
      instapay: "Instapay",
      card: "Card",
    } as Record<string, string>
  )[m] ?? m;
}
