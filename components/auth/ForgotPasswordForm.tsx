"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Locale } from "@/lib/i18n-config";
import { cn } from "@/lib/utils";

/**
 * Forgot-password form. Hands the email to Supabase auth's
 * `resetPasswordForEmail`, which delivers a recovery link that the
 * user follows to set a new password.
 *
 * Always shows the success message on submit (even when the email
 * isn't on file) so the form can't be used to enumerate accounts.
 */
export function ForgotPasswordForm({ locale }: { locale: Locale }) {
  const isRTL = locale === "ar";
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setError(null);
    setPending(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(`/${locale}/account`)}`,
        },
      );
      // We surface only network-class errors; "user not found" stays
      // hidden to avoid account enumeration.
      if (resetErr && resetErr.status && resetErr.status >= 500) {
        setError(isRTL ? "حصلت مشكلة، جرب تاني." : "Something went wrong.");
        setPending(false);
        return;
      }
      setDone(true);
    } catch {
      setError(isRTL ? "مشكلة في الاتصال." : "Network error.");
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border border-[var(--color-success)]/40 bg-[var(--color-success)]/5 p-6 text-center">
        <p className="font-display text-lg text-[var(--color-text)]">
          {isRTL ? "تم! ✉️" : "Check your inbox ✉️"}
        </p>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          {isRTL
            ? `لو ${email} مسجل عندنا، هتلاقي رابط استعادة كلمة المرور في بريدك.`
            : `If ${email} is registered, you'll receive a password-reset link in your inbox.`}
        </p>
        <Link
          href={`/${locale}/auth/login`}
          className="mt-4 inline-block text-xs font-semibold text-[var(--color-primary)] underline-offset-4 hover:underline"
        >
          {isRTL ? "العودة لتسجيل الدخول" : "Back to sign in"}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className={isRTL ? "text-right" : undefined}>
        <label
          htmlFor="forgot-email"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]"
        >
          {isRTL ? "البريد الإلكتروني" : "Email"}
        </label>
        <input
          id="forgot-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          dir="ltr"
          className={cn(
            "block w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-sm text-[var(--color-text)] transition focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30",
            isRTL && "text-right",
          )}
        />
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-md border border-[var(--color-error)]/40 bg-[var(--color-error)]/10 px-3 py-2 text-sm text-[var(--color-error)]"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-primary)]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {isRTL ? "أرسل رابط الاستعادة" : "Send reset link"}
      </button>

      <p className="text-center text-sm text-[var(--color-text-secondary)]">
        <Link
          href={`/${locale}/auth/login`}
          className="text-[var(--color-primary)] underline-offset-4 hover:underline"
        >
          {isRTL ? "العودة لتسجيل الدخول" : "Back to sign in"}
        </Link>
      </p>
    </form>
  );
}
