"use client";

import { Printer } from "lucide-react";
import type { AdminLocale } from "@/lib/admin/locale";

/** Tiny client wrapper so we can call window.print() from a server page. */
export function PrintInvoiceButton({ locale }: { locale: AdminLocale }) {
  const isAr = locale === "ar";
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-4 py-2 text-xs font-semibold text-[var(--color-text)] transition hover:border-[var(--color-accent)]"
    >
      <Printer className="h-3.5 w-3.5" />
      {isAr ? "طباعة الفاتورة" : "Print invoice"}
    </button>
  );
}
