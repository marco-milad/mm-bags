"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import "./globals.css";

/**
 * Last-resort boundary: only shows when the [locale] root layout itself
 * throws (e.g. its catalogue reads fail), so nothing from that layout —
 * fonts, navbar, dictionary, locale — can be relied on. It replaces the
 * layout, hence its own <html>/<body> and the global CSS import; no
 * `metadata` export is allowed here, so the title is a React <title>.
 *
 * Bilingual like not-found.tsx: Arabic first (the default locale), English
 * underneath.
 */
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-full bg-[var(--color-bg)] text-[var(--color-text)] antialiased">
        <title>M.M Bags — حصلت مشكلة / Something went wrong</title>
        <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-2xl font-semibold tracking-wide">M.M Bags</p>
          <h1 className="text-2xl font-bold">حصلت مشكلة عندنا</h1>
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-text-secondary)]">
            Something went wrong
          </p>
          <p className="max-w-sm text-sm text-[var(--color-text-secondary)]">
            الموقع ماتحمّلش زي ما المفروض. جرّب تاني بعد لحظة.
            <br />
            <span dir="ltr" className="text-xs">
              The site didn&apos;t load properly. Please try again in a moment.
            </span>
          </p>
          {error.digest && (
            <p className="font-mono text-xs text-[var(--color-text-secondary)]">
              <bdi>{error.digest}</bdi>
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => unstable_retry()}
              className="inline-flex min-h-11 items-center rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-light)]"
            >
              جرّب تاني / Try again
            </button>
            {/* Plain <a>, not <Link>: the app shell is what broke, so a full
                document load is the more reliable way out than a client
                transition into the same failing layout. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- deliberate hard navigation, see above */}
            <a
              href="/ar"
              className="inline-flex min-h-11 items-center rounded-full border border-[var(--color-border)] px-6 py-3 text-sm font-medium text-[var(--color-text)] transition hover:border-[var(--color-accent)]"
            >
              الرئيسية / Home
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
