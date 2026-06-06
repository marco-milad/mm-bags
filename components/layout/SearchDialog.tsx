"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { Locale } from "@/lib/i18n-config";

type Labels = {
  search: string;            // trigger aria-label + dialog title
  search_placeholder: string;
  search_submit: string;
  search_empty: string;
};

/**
 * Trigger button is a plain <button> (no Radix asChild Slot) so no Radix-generated
 * attributes are injected into the server HTML. Dialog is rendered only after the
 * component mounts, sidestepping the same Radix-Id hydration mismatch we hit with
 * SizeGuideModal.
 */
export function SearchDialog({
  locale,
  labels,
}: {
  locale: Locale;
  labels: Labels;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  // Autofocus the input when the dialog opens. Slight delay so it fires after
  // the Radix focus-trap mount.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [open]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = q.trim();
    if (!trimmed) return;
    setOpen(false);
    router.push(`/${locale}/catalog?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={labels.search}
        className="rounded-full p-2 text-[var(--color-text)] transition hover:bg-[var(--color-surface)]"
      >
        <Search className="h-5 w-5" />
      </button>

      {mounted && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent
            closeAriaLabel={locale === "ar" ? "إغلاق" : "Close"}
            className="max-w-xl"
          >
            <form onSubmit={onSubmit} className="flex flex-col">
              <header className="border-b border-[var(--color-border)] px-6 py-5">
                <DialogTitle className="font-display text-xl text-[var(--color-primary)]">
                  {labels.search}
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  {labels.search_empty}
                </DialogDescription>
              </header>

              <div className="flex items-center gap-2 px-6 py-5">
                <div className="relative flex-1">
                  <Search
                    aria-hidden
                    className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-secondary)] ltr:left-3 rtl:right-3"
                  />
                  <input
                    ref={inputRef}
                    type="search"
                    inputMode="search"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder={labels.search_placeholder}
                    maxLength={80}
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] py-3 text-sm outline-none transition focus:border-[var(--color-text)] ltr:pl-9 ltr:pr-3 rtl:pl-3 rtl:pr-9"
                  />
                </div>
                <button
                  type="submit"
                  disabled={q.trim().length === 0}
                  className="rounded-lg bg-[var(--color-text)] px-5 py-3 text-sm font-medium text-[var(--color-bg)] transition hover:opacity-90 disabled:opacity-40"
                >
                  {labels.search_submit}
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
