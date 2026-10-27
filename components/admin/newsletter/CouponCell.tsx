"use client";

import { useState } from "react";
import { Check, Copy, Mail } from "lucide-react";

/**
 * The issued code in the subscribers table: copy it, or open a pre-filled
 * Gmail message to the subscriber (no mail domain needed — it sends from
 * Marco's own Gmail).
 */
export function CouponCell({
  code,
  gmailUrl,
  state,
  isAr,
}: {
  code: string;
  gmailUrl: string;
  /** Already-localised status line, e.g. "Unused · valid until …". */
  state: string;
  isAr: boolean;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <span dir="ltr" className="select-all font-mono text-[12px] font-semibold text-[var(--color-text)]">
          {code}
        </span>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(code).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
          aria-label={isAr ? "نسخ الكود" : "Copy code"}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-[var(--color-success)]" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
        <a
          href={gmailUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text)] transition hover:border-[var(--color-accent)]"
        >
          <Mail className="h-3 w-3" />
          {isAr ? "ابعته بـ Gmail" : "Send via Gmail"}
        </a>
      </div>
      <p className="text-[11px] text-[var(--color-text-secondary)]">{state}</p>
    </div>
  );
}
