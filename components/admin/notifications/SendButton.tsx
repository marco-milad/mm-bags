"use client";

import { Loader2, Send, Sparkles } from "lucide-react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

/**
 * Submit button for the "Send N pending" forms on /admin/notifications.
 *
 * Two safety nets that the bare server-action forms lacked:
 *   - `useFormStatus().pending` disables the button while the action
 *     is in flight, so double-clicks can't fan out a second batch.
 *   - The provided `confirmMessage` triggers a native confirm() before
 *     the form actually submits — gives the operator one chance to
 *     bail before paying for Twilio + Resend sends.
 *
 * The form-action stays a real <form action> wrapping THIS button so
 * Next.js Server Action semantics + redirects keep working.
 */
export function SendButton({
  pendingCount,
  disabled,
  variant = "default",
  confirmMessage,
}: {
  pendingCount: number;
  disabled?: boolean;
  variant?: "default" | "bulk";
  confirmMessage: string;
}) {
  const { pending } = useFormStatus();

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    if (pending || disabled || pendingCount === 0) return;
    if (!window.confirm(confirmMessage)) e.preventDefault();
  }

  if (variant === "bulk") {
    return (
      <button
        type="submit"
        onClick={handleClick}
        disabled={pending || disabled || pendingCount === 0}
        className="inline-flex items-center gap-1.5 rounded-full bg-brass-500 px-4 py-2 text-sm font-semibold text-navy-900 transition hover:bg-brass-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        Send all pending ({pendingCount})
      </button>
    );
  }

  return (
    <button
      type="submit"
      onClick={handleClick}
      disabled={pending || disabled || pendingCount === 0}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-[var(--color-primary)] bg-[var(--color-primary)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-60",
      )}
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Send className="h-3.5 w-3.5" />
      )}
      إرسال إشعار ({pendingCount})
    </button>
  );
}
