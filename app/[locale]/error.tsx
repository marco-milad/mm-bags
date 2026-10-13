"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { RotateCcw, ShoppingBag } from "lucide-react";

/**
 * Storefront error boundary for everything under /[locale] (the [locale]
 * layout itself is covered by app/global-error.tsx). Styled like
 * not-found.tsx so a failure still looks like the shop, not a crash.
 *
 * Error boundaries receive no params, so the locale comes from the URL via
 * useParams(); anything unexpected falls back to Arabic, the default.
 */
export default function LocaleError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const params = useParams<{ locale?: string }>();
  const locale = params?.locale === "en" ? "en" : "ar";
  const isAr = locale === "ar";

  useEffect(() => {
    // Server errors arrive here with a generic message + digest only; the
    // digest is what matches the entry in the server logs.
    console.error(error);
  }, [error]);

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
      <p
        aria-hidden
        className="font-display text-7xl text-[var(--color-accent)]/50 md:text-8xl"
      >
        !
      </p>
      <h1 className="font-display text-2xl md:text-3xl">
        {isAr ? "حصلت مشكلة عندنا" : "Something went wrong"}
      </h1>
      <p className="max-w-sm text-sm text-[var(--color-text-secondary)]">
        {isAr
          ? "الصفحة دي ماتحمّلتش زي ما المفروض. جرّب تاني — ولو فضلت كده، كمّل تسوّق من المنتجات."
          : "This page didn't load the way it should. Try again — if it keeps happening, keep shopping from the catalog."}
      </p>
      {error.digest && (
        <p className="font-mono text-xs text-[var(--color-text-secondary)]">
          {isAr ? "كود المشكلة: " : "Error code: "}
          <bdi>{error.digest}</bdi>
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          // Re-fetches and re-renders the segment; if the cause was
          // transient (network blip, cold DB) the page simply comes back.
          onClick={() => unstable_retry()}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-light)]"
        >
          <RotateCcw className="h-4 w-4" />
          {isAr ? "جرّب تاني" : "Try again"}
        </button>
        <Link
          href={`/${locale}/catalog`}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[var(--color-border)] px-6 py-3 text-sm font-medium text-[var(--color-text)] transition hover:border-[var(--color-accent)]"
        >
          <ShoppingBag className="h-4 w-4" />
          {isAr ? "تصفّح المنتجات" : "Browse the catalog"}
        </Link>
      </div>
    </section>
  );
}
