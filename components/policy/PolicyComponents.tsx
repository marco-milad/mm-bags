import Link from "next/link";

/**
 * Shared building blocks for the static policy pages (refund / shipping
 * / terms-of-service). Each page composes its own copy from these
 * primitives so the visual rhythm and SEO heading hierarchy stays
 * consistent across all three.
 */

export function PolicyHeader({
  eyebrow,
  title,
  subtitle,
  updated,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  updated: string;
}) {
  return (
    <header className="mx-auto max-w-3xl px-4 pt-14 pb-8 text-center md:px-6 md:pt-20 md:pb-12">
      <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--color-accent-dark)]">
        {eyebrow}
      </p>
      <h1 className="mt-4 font-serif text-4xl text-[var(--color-text)] md:text-5xl">
        {title}
      </h1>
      <p className="mt-3 text-sm text-[var(--color-text-secondary)] md:text-base">
        {subtitle}
      </p>
      <p className="mt-4 font-mono text-[11px] uppercase tracking-wider text-[var(--color-text-secondary)]">
        {updated}
      </p>
    </header>
  );
}

export function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-serif text-xl text-[var(--color-text)] md:text-2xl">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function Body({
  children,
  isAr,
}: {
  children: React.ReactNode;
  isAr: boolean;
}) {
  return (
    <p
      dir={isAr ? "rtl" : "ltr"}
      className="text-[15px] leading-7 text-[var(--color-text)]"
    >
      {children}
    </p>
  );
}

export function Bullet({
  children,
  isAr,
}: {
  children: React.ReactNode;
  isAr: boolean;
}) {
  return (
    <li
      dir={isAr ? "rtl" : "ltr"}
      className="flex items-start gap-2 text-[15px] leading-7 text-[var(--color-text)]"
    >
      <span
        aria-hidden
        className="mt-2.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent-dark)]"
      />
      <span className="min-w-0">{children}</span>
    </li>
  );
}

export function Step({
  n,
  children,
  isAr,
}: {
  n: number;
  children: React.ReactNode;
  isAr: boolean;
}) {
  return (
    <li
      dir={isAr ? "rtl" : "ltr"}
      className="flex items-start gap-3 text-[15px] leading-7 text-[var(--color-text)]"
    >
      <span
        aria-hidden
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)]/15 font-mono text-xs font-semibold text-[var(--color-accent-dark)]"
      >
        {n}
      </span>
      <span className="min-w-0 pt-0.5">{children}</span>
    </li>
  );
}

export function RelatedLinks({
  isAr,
  items,
}: {
  isAr: boolean;
  items: { href: string; ar: string; en: string }[];
}) {
  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 md:p-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--color-accent-dark)]">
        {isAr ? "روابط مفيدة" : "Helpful links"}
      </p>
      <ul className="mt-3 space-y-2">
        {items.map((it) => (
          <li key={it.href}>
            <Link
              href={it.href}
              className="text-sm font-medium text-[var(--color-text)] underline-offset-4 hover:text-[var(--color-accent-dark)] hover:underline"
            >
              {isAr ? it.ar : it.en} →
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
