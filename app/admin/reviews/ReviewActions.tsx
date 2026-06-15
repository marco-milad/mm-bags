"use client";

import { Check, Loader2, X } from "lucide-react";
import { useState, useTransition } from "react";
import { approveReview, rejectReview } from "./actions";

/**
 * Per-row Approve / Reject pair for the admin reviews queue.
 *
 * Both actions hit a server action and revalidate the queue + the PDP
 * inside the action itself, so when the page re-renders the row is
 * gone. We optimistically hide the row locally too so the click feels
 * instant even on slow network — falling back to the revalidation
 * sweep as the source of truth.
 */
export function ReviewActions({
  reviewId,
  productSlug,
}: {
  reviewId: string;
  productSlug: string | null;
}) {
  const [hidden, setHidden] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (hidden) return null;

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        setError(res.error ?? "Failed");
        return;
      }
      setHidden(true);
    });
  }

  return (
    <div className="mt-5 flex items-center gap-2 border-t border-[var(--color-border)] pt-4">
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => approveReview(reviewId, productSlug))}
        className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-success)] px-4 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Check className="h-3.5 w-3.5" />
        )}
        Approve
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => rejectReview(reviewId))}
        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-4 py-1.5 text-xs font-semibold text-[var(--color-text)] transition hover:border-[var(--color-error)] hover:text-[var(--color-error)] disabled:opacity-60"
      >
        <X className="h-3.5 w-3.5" />
        Reject
      </button>
      {error && (
        <span className="text-xs text-[var(--color-error)]">{error}</span>
      )}
    </div>
  );
}
