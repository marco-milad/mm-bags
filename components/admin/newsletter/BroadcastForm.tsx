"use client";

import { Loader2, Send } from "lucide-react";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  sendBroadcast,
  type BroadcastResult,
} from "@/lib/admin/newsletter-actions";

/**
 * Broadcast send form. Shows AR + EN subject and body inputs side-by-side,
 * with a Preview toggle that renders the wrapping template inline so the
 * admin can sanity-check before firing the send.
 *
 * Uses useActionState + useFormStatus — once the action returns the result
 * banner stays sticky so the admin can read the sent/failed split.
 */
export function BroadcastForm({ activeCount }: { activeCount: number }) {
  const [previewLocale, setPreviewLocale] = useState<"ar" | "en" | null>(null);
  const [subjectAr, setSubjectAr] = useState("");
  const [subjectEn, setSubjectEn] = useState("");
  const [bodyAr, setBodyAr] = useState("");
  const [bodyEn, setBodyEn] = useState("");

  const initialState: BroadcastResult = { ok: true, sent: 0, failed: 0 };
  const [state, action] = useActionState(sendBroadcast, initialState);

  return (
    <form
      action={action}
      className="space-y-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-lg text-[var(--color-text)]">
          Broadcast email
        </h2>
        <p className="text-xs text-[var(--color-text-secondary)]">
          Sends to {activeCount} active subscriber{activeCount === 1 ? "" : "s"}{" "}
          via Resend, each in their preferred locale.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <fieldset className="space-y-2 rounded-lg border border-dashed border-[var(--color-border)] p-3">
          <legend className="px-1 text-[10px] uppercase tracking-wider text-[var(--color-text-secondary)]">
            Arabic
          </legend>
          <input
            name="subjectAr"
            required
            dir="rtl"
            value={subjectAr}
            onChange={(e) => setSubjectAr(e.target.value)}
            placeholder="موضوع الرسالة"
            aria-label="Arabic subject"
            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:border-[var(--color-accent)]"
          />
          <textarea
            name="bodyAr"
            required
            dir="rtl"
            rows={8}
            value={bodyAr}
            onChange={(e) => setBodyAr(e.target.value)}
            placeholder="اكتب الرسالة هنا..."
            aria-label="Arabic body"
            className="w-full resize-y rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:border-[var(--color-accent)]"
          />
        </fieldset>

        <fieldset className="space-y-2 rounded-lg border border-dashed border-[var(--color-border)] p-3">
          <legend className="px-1 text-[10px] uppercase tracking-wider text-[var(--color-text-secondary)]">
            English
          </legend>
          <input
            name="subjectEn"
            required
            value={subjectEn}
            onChange={(e) => setSubjectEn(e.target.value)}
            placeholder="Subject"
            aria-label="English subject"
            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:border-[var(--color-accent)]"
          />
          <textarea
            name="bodyEn"
            required
            rows={8}
            value={bodyEn}
            onChange={(e) => setBodyEn(e.target.value)}
            placeholder="Write your message here..."
            aria-label="English body"
            className="w-full resize-y rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:border-[var(--color-accent)]"
          />
        </fieldset>
      </div>

      {/* Preview toggle */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setPreviewLocale(previewLocale === "ar" ? null : "ar")}
          className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs font-medium text-[var(--color-text)] hover:border-[var(--color-accent)]"
        >
          {previewLocale === "ar" ? "Hide AR preview" : "Preview AR"}
        </button>
        <button
          type="button"
          onClick={() => setPreviewLocale(previewLocale === "en" ? null : "en")}
          className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs font-medium text-[var(--color-text)] hover:border-[var(--color-accent)]"
        >
          {previewLocale === "en" ? "Hide EN preview" : "Preview EN"}
        </button>
      </div>

      {previewLocale && (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="mb-2 text-[10px] uppercase tracking-wider text-[var(--color-text-secondary)]">
            Preview — {previewLocale.toUpperCase()}
          </p>
          <p
            className="mb-1 font-semibold text-[var(--color-text)]"
            dir={previewLocale === "ar" ? "rtl" : "ltr"}
          >
            {previewLocale === "ar" ? subjectAr : subjectEn}
          </p>
          <p
            className="whitespace-pre-wrap text-sm text-[var(--color-text)]"
            dir={previewLocale === "ar" ? "rtl" : "ltr"}
          >
            {previewLocale === "ar" ? bodyAr : bodyEn}
          </p>
        </div>
      )}

      {/* Result banner */}
      {state && !state.ok && (
        <p
          role="alert"
          className="rounded-md border border-[var(--color-error)]/40 bg-[var(--color-error)]/10 px-3 py-2 text-sm text-[var(--color-error)]"
        >
          {state.error}
        </p>
      )}
      {state && state.ok && (state.sent > 0 || state.failed > 0) && (
        <p
          role="status"
          className="rounded-md border border-[var(--color-success)]/40 bg-[var(--color-success)]/10 px-3 py-2 text-sm text-[var(--color-success)]"
        >
          ✅ Sent to {state.sent} subscriber{state.sent === 1 ? "" : "s"}.
          {state.failed > 0 && ` ${state.failed} failed.`}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (!confirm("Send broadcast email to ALL active subscribers?"))
          e.preventDefault();
      }}
      className="inline-flex items-center gap-2 rounded-full bg-brass-500 px-6 py-2.5 text-sm font-semibold text-navy-900 transition hover:bg-brass-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      Send broadcast
    </button>
  );
}
