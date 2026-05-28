import Link from "next/link";
import type { Locale } from "@/lib/i18n-config";

export function FounderQuote({
  locale,
  quote,
  name,
}: {
  locale: Locale;
  quote: string;
  name: string;
}) {
  return (
    <section className="border-y border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-5 md:px-12">
        <div
          aria-hidden
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] font-display text-base text-[var(--color-accent-light)]"
        >
          MM
        </div>
        <blockquote className="flex-1 text-sm leading-relaxed text-[var(--color-text)] md:text-base">
          &ldquo;{quote}&rdquo;
          <span className="ml-2 text-xs text-[var(--color-text-secondary)]">— {name}</span>
        </blockquote>
        <Link
          href={`/${locale}/about`}
          className="hidden whitespace-nowrap text-xs font-medium text-[var(--color-primary)] underline-offset-4 hover:underline md:inline"
        >
          {locale === "ar" ? "اقرأ القصة كاملة" : "Read the full story"} →
        </Link>
      </div>
    </section>
  );
}
