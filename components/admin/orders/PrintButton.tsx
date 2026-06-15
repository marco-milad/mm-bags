"use client";

import { Printer } from "lucide-react";

/** Tiny client wrapper so we can call window.print() from a server page. */
export function PrintInvoiceButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-4 py-2 text-xs font-semibold text-[var(--color-text)] transition hover:border-[var(--color-accent)]"
    >
      <Printer className="h-3.5 w-3.5" />
      Print invoice
    </button>
  );
}
