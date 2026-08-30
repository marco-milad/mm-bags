"use client";

import { useActionState } from "react";
import { addSynonym, type SynonymResult } from "@/lib/admin/synonyms";

/**
 * Inline "map this term to something we do stock" control.
 *
 * useActionState rather than a bare <form action>: addSynonym returns a result
 * (duplicate term, self-mapping) and a plain form action must return void, so
 * the error would otherwise vanish. This mirrors how the rest of the admin
 * handles forms that can fail — the void-returning pattern is reserved for
 * toggles and deletes that cannot.
 */
export function AddSynonymForm({ term, isAr }: { term: string; isAr: boolean }) {
  const [state, formAction, pending] = useActionState<SynonymResult | null, FormData>(
    async (_prev, formData) => addSynonym(formData),
    null,
  );

  return (
    <form action={formAction} className="flex shrink-0 items-center gap-1">
      <input type="hidden" name="term" value={term} />
      <input
        name="maps_to"
        dir="auto"
        required
        placeholder={isAr ? "يقصد…" : "means…"}
        className="w-24 rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-1.5 py-0.5 text-[11px]"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-[var(--color-primary)] px-2 py-0.5 text-[11px] text-white disabled:opacity-50"
      >
        {pending ? (isAr ? "…" : "…") : isAr ? "اربط" : "Map"}
      </button>
      {state && !state.ok && (
        <span className="text-[10px] text-[var(--color-error)]">{state.error}</span>
      )}
    </form>
  );
}
