"use client";

import { Loader2, Minus, Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { adjustStock } from "@/lib/admin/stock-actions";

/**
 * Quick +/- stock adjustment with an optional reason prompt. Used in
 * the /admin/stock current-stock tab next to each variant row.
 *
 * Server action does the heavy lifting (read + write + ledger row +
 * revalidate). We just show optimistic feedback + a tiny error pill
 * if the action fails.
 */
export function AdjustButton({
  variantId,
  delta,
}: {
  variantId: string;
  delta: number;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handle() {
    setError(null);
    startTransition(async () => {
      const reason =
        delta < 0
          ? window.prompt("Reason for write-off:") ?? undefined
          : window.prompt("Reason for restock (optional):") ?? undefined;
      const res = await adjustStock({ variantId, delta, reason });
      if (!res.ok) setError(res.error);
    });
  }

  const Icon = delta < 0 ? Minus : Plus;
  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      <button
        type="button"
        onClick={handle}
        disabled={pending}
        aria-label={delta < 0 ? "Decrease stock" : "Increase stock"}
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
