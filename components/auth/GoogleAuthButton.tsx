"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Locale } from "@/lib/i18n-config";

/**
 * Shared Google OAuth button for the login + register pages.
 *
 * Flow:
 *   1. signInWithOAuth → Supabase redirects to Google.
 *   2. Google bounces back to /auth/callback?code=…
 *   3. The callback route handler exchanges the code for a session
 *      and redirects to `next` (or `/{locale}/account` by default).
 *
 * Requires the Supabase project's Google provider to be enabled and
 * the redirect URL allow-listed in the Supabase dashboard.
 */
export function GoogleAuthButton({
  locale,
  next,
}: {
  locale: Locale;
  next?: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setPending(true);
    try {
      const supabase = createSupabaseBrowserClient();
      // window.location.origin makes this work on any environment —
      // localhost, preview deploys, and prod — without an env var.
      const callback = new URL("/auth/callback", window.location.origin);
      if (next) callback.searchParams.set("next", next);
      callback.searchParams.set("locale", locale);
      const { error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callback.toString() },
      });
      if (oauthErr) {
        setError(
          locale === "ar"
            ? "حصلت مشكلة في تسجيل الدخول، جرب تاني."
            : oauthErr.message,
        );
        setPending(false);
      }
      // On success the browser navigates to Google; no further state.
    } catch {
      setError(locale === "ar" ? "مشكلة في الاتصال." : "Network error.");
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm font-medium text-[var(--color-text)] transition hover:border-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <GoogleLogo />
        )}
        {locale === "ar" ? "المتابعة عن طريق Google" : "Continue with Google"}
      </button>
      {error && (
        <p
          role="alert"
          className="mt-2 text-xs text-[var(--color-error)]"
        >
          {error}
        </p>
      )}
    </>
  );
}

/**
 * Inline Google "G" mark — lucide-react has no brand icons so we
 * use the official multi-colour glyph.
 */
function GoogleLogo() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      aria-hidden
      className="h-4 w-4"
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1A6.62 6.62 0 0 1 5.5 12c0-.74.13-1.46.34-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.93l3.66-2.83Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}
