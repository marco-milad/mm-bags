"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Locale } from "@/lib/i18n-config";
import { cn } from "@/lib/utils";
import { newPasswordError, passwordUpdateErrorText } from "@/lib/auth/password";

/**
 * Set-a-new-password form, reached from the reset email:
 * reset link → /auth/callback (exchanges the code, signs the user in) →
 * /{locale}/auth/reset-password. The page only renders this when a session
 * exists, so updateUser() acts on the account that requested the reset.
 */
export function ResetPasswordForm({ locale }: { locale: Locale }) {
  const isRTL = locale === "ar";
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    const invalid = newPasswordError(password, confirm, isRTL);
    if (invalid) {
      setError(invalid);
      return;
    }
    setError(null);
    setPending(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: updErr } = await supabase.auth.updateUser({ password });
      if (updErr) {
        setError(passwordUpdateErrorText(updErr.code, isRTL));
        setPending(false);
        return;
      }
      setDone(true);
      router.refresh();
    } catch {
      setError(isRTL ? "مشكلة في الاتصال." : "Network error.");
      setPending(false);
    }
  }

  if (done) {
    return (
      <div
        role="status"
        className="rounded-xl border border-[var(--color-success)]/40 bg-[var(--color-success)]/5 p-6 text-center"
      >
        <p className="font-display text-lg text-[var(--color-text)]">
          {isRTL ? "اتغيّرت كلمة المرور ✅" : "Password updated ✅"}
        </p>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          {isRTL
            ? "من دلوقتي ادخل بكلمة المرور الجديدة."
            : "Use your new password from now on."}
        </p>
        <Link
          href={`/${locale}/account`}
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--color-primary)] px-6 text-sm font-semibold text-white transition hover:bg-[var(--color-primary)]/90"
        >
          {isRTL ? "روح لحسابي" : "Go to my account"}
        </Link>
      </div>
    );
  }

  const inputCls = cn(
    "block w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-sm text-[var(--color-text)] transition focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30",
    isRTL && "text-right",
  );
  const labelCls =
    "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]";

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className={isRTL ? "text-right" : undefined}>
        <label htmlFor="reset-password" className={labelCls}>
          {isRTL ? "كلمة المرور الجديدة" : "New password"}
        </label>
        <input
          id="reset-password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? "reset-error" : "reset-hint"}
          dir="ltr"
          className={inputCls}
        />
        <p id="reset-hint" className="mt-1 text-xs text-[var(--color-text-secondary)]">
          {isRTL ? "8 حروف على الأقل" : "At least 8 characters"}
        </p>
      </div>
      <div className={isRTL ? "text-right" : undefined}>
        <label htmlFor="reset-confirm" className={labelCls}>
          {isRTL ? "أكّد كلمة المرور" : "Confirm password"}
        </label>
        <input
          id="reset-confirm"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? "reset-error" : undefined}
          dir="ltr"
          className={inputCls}
        />
      </div>

      {error && (
        <p
          id="reset-error"
          role="alert"
          className="rounded-md border border-[var(--color-error)]/40 bg-[var(--color-error)]/10 px-3 py-2 text-sm text-[var(--color-error)]"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-primary)]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {isRTL ? "احفظ كلمة المرور" : "Save password"}
      </button>
    </form>
  );
}
