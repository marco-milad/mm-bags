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
 * Email + password register form.
 *
 * On success two outcomes are possible depending on the Supabase
 * project's email-confirmation setting:
 *   - Confirmation OFF → session is live immediately, we push to
 *     `next` or /{locale}/account.
 *   - Confirmation ON → we show a "check your email" message; the
 *     user must click the link before any session exists.
 *
 * We detect the case via `signUp`'s response: when confirmation is
 * required, `data.session` is null even on success.
 */
export function RegisterForm({
  locale,
  next,
}: {
  locale: Locale;
  next?: string;
}) {
  const isRTL = locale === "ar";
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConfirm, setNeedsConfirm] = useState(false);

  function safeNext(): string {
    if (next && next.startsWith("/")) return next;
    return `/${locale}/account`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    if (password !== confirmPassword) {
      setError(
        isRTL ? "كلمتي المرور مش متطابقتين." : "Passwords don't match.",
      );
      return;
    }
    if (password.length < 8) {
      setError(
        isRTL
          ? "كلمة المرور لازم تكون 8 حروف على الأقل."
          : "Password must be at least 8 characters.",
      );
      return;
    }
    setError(null);
    setPending(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error: signErr } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { name: name.trim() },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext())}`,
        },
      });
      if (signErr) {
        setError(
          isRTL ? "حصلت مشكلة في التسجيل." : signErr.message,
        );
        setPending(false);
        return;
      }
      if (!data.session) {
        // Email confirmation required.
        setNeedsConfirm(true);
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

  if (needsConfirm) {
    return (
      <div className="rounded-xl border border-[var(--color-success)]/40 bg-[var(--color-success)]/5 p-6 text-center">
        <p className="font-display text-lg text-[var(--color-text)]">
          {isRTL ? "أكد بريدك الإلكتروني ✉️" : "Check your inbox ✉️"}
        </p>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          {isRTL
            ? `بعتنالك رابط تأكيد على ${email}. افتحه وارجع لاستكمال التسجيل.`
            : `We sent a confirmation link to ${email}. Open it to complete your registration.`}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Field
          id="register-name"
          label={isRTL ? "الاسم" : "Name"}
          isRTL={isRTL}
        >
          <input
            id="register-name"
            type="text"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            minLength={2}
            maxLength={80}
            className={inputCls(isRTL)}
          />
        </Field>
        <Field
          id="register-email"
          label={isRTL ? "البريد الإلكتروني" : "Email"}
          isRTL={isRTL}
        >
          <input
            id="register-email"
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
          id="register-password"
          label={isRTL ? "كلمة المرور" : "Password"}
          isRTL={isRTL}
          hint={
            <span className="text-[11px] text-[var(--color-text-secondary)]">
              {isRTL ? "8 حروف على الأقل" : "8 chars min"}
            </span>
          }
        >
          <input
            id="register-password"
            type="password"
            required
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            dir="ltr"
            className={inputCls(isRTL)}
          />
        </Field>
        <Field
          id="register-confirm"
          label={isRTL ? "تأكيد كلمة المرور" : "Confirm password"}
          isRTL={isRTL}
        >
          <input
            id="register-confirm"
            type="password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
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
          {isRTL ? "إنشاء حساب" : "Create account"}
        </button>
      </form>

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-[var(--color-border)]" aria-hidden />
        <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-secondary)]">
          {isRTL ? "أو" : "or"}
        </span>
        <span className="h-px flex-1 bg-[var(--color-border)]" aria-hidden />
      </div>

      <GoogleAuthButton locale={locale} next={next} />

      <p className="pt-2 text-center text-sm text-[var(--color-text-secondary)]">
        {isRTL ? "عندك حساب؟ " : "Already have an account? "}
        <Link
          href={
            next
              ? `/${locale}/auth/login?next=${encodeURIComponent(next)}`
              : `/${locale}/auth/login`
          }
          className="font-semibold text-[var(--color-primary)] underline-offset-4 hover:underline"
        >
          {isRTL ? "سجل دخول" : "Sign in"}
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
