"use client";

import { XCircle } from "lucide-react";
import { cancelPurchaseOrderForm } from "@/lib/admin/supplier-actions";

/**
 * Cancel button for a pending PO. The server action hard-deletes the
 * row + child items + unwinds any captured payment back to the
 * supplier's running totals. Shown only when status === "pending"
 * (the only safe-to-cancel state — once goods are received, the
 * stock movements would need an explicit return flow to reverse).
 *
 * Client component for the confirm() prompt; server action does the
 * actual work.
 */
export function CancelPOButton({ id, isAr }: { id: string; isAr: boolean }) {
  return (
    <form action={cancelPurchaseOrderForm}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        onClick={(e) => {
          if (
            !confirm(
              isAr
                ? "تأكيد إلغاء أمر الشراء؟ ده هيمسحه نهائيًا من السجل."
                : "Cancel this purchase order? It will be permanently removed.",
            )
          ) {
            e.preventDefault();
          }
        }}
        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-4 py-2 text-xs font-medium text-[var(--color-text-secondary)] transition hover:border-[var(--color-error)] hover:text-[var(--color-error)]"
      >
        <XCircle className="h-3.5 w-3.5" />
        {isAr ? "إلغاء أمر الشراء" : "Cancel PO"}
      </button>
    </form>
  );
}
