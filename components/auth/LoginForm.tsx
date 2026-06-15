"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Locale } from "@/lib/i18n-config";
import { cn } from "@/lib/utils";
import { GoogleAuthButton } from "./GoogleAuthButton";

/**
 * Email + password login form using Supabase auth in the browser.
 *
 * On success: respects a `next` query param (e.g. /admin), falling
 * back to /{locale}/account. We only honour `next` when it starts
 * with `/` to dodge open-redirect attacks.
 */
export function LoginForm({
  locale,
  next,
}: {
  locale: Locale;
  next?: string;
}) {
  const isRTL = locale === "ar";
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function safeNext(): string {
    if (next && next.startsWith("/")) return next;
    return `/${locale}/account`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setError(null);
    setPending(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signErr) {
        setError(
          isRTL
            ? "البريد أو كلمة المرور غلط."
            : signErr.message,
        );
        setPending(false);
        return;
      }
      router.push(safeNext());
      router.refresh();
    } catch {
      setError(isRTL ? "مشكلة في الاتصال." : "Network error.");
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Field
          id="login-email"
          label={isRTL ? "البريد الإلكتروني" : "Email"}
          isRTL={isRTL}
        >
          <input
            id="login-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            dir="ltr"
            className={inputCls(isRTL)}
          />
        </Field>
        <Field
          id="login-password"
          label={isRTL ? "كلمة المرور" : "Password"}
          isRTL={isRTL}
          hint={
            <Link
              href={`/${locale}/auth/forgot-password`}
              className="text-[11px] text-[var(--color-primary)] underline-offset-4 hover:underline"
            >
              {isRTL ? "نسيت كلمة المرور؟" : "Forgot password?"}
            </Link>
          }
        >
          <input
            id="login-password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            dir="ltr"
            className={inputCls(isRTL)}
          />
        </Field>

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
          {isRTL ? "تسجيل دخول" : "Sign in"}
        </button>
      </form>

      {/* Provider divider */}
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-[var(--color-border)]" aria-hidden />
        <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-secondary)]">
          {isRTL ? "أو" : "or"}
        </span>
        <span className="h-px flex-1 bg-[var(--color-border)]" aria-hidden />
      </div>

      <GoogleAuthButton locale={locale} next={next} />

      <p className="pt-2 text-center text-sm text-[var(--color-text-secondary)]">
        {isRTL ? "مش عندك حساب؟ " : "Don't have an account? "}
        <Link
          href={
            next
              ? `/${locale}/auth/register?next=${encodeURIComponent(next)}`
              : `/${locale}/auth/register`
          }
          className="font-semibold text-[var(--color-primary)] underline-offset-4 hover:underline"
        >
          {isRTL ? "سجل دلوقتي" : "Register"}
        </Link>
      </p>
    </div>
  );
}

function Field({
  id,
  label,
  isRTL,
  hint,
  children,
}: {
  id: string;
  label: string;
  isRTL: boolean;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={isRTL ? "text-right" : undefined}>
      <div className="mb-1.5 flex items-baseline justify-between">
        <label
          htmlFor={id}
          className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]"
        >
          {label}
        </label>
        {hint}
      </div>
      {children}
    </div>
  );
}

function inputCls(isRTL: boolean): string {
  return cn(
    "block w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-sm text-[var(--color-text)] transition focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30",
    isRTL && "text-right",
  );
}
