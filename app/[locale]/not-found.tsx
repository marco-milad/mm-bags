import Link from "next/link";
import { ArrowLeft, ShoppingBag } from "lucide-react";

/**
 * Locale-agnostic 404 (Next's not-found.tsx boundary doesn't
 * receive the [locale] param when triggered outside a route with
 * params). Bilingual copy — the Arabic line is primary since the
 * site defaults to /ar, the English line is a fallback for
 * en-locale visitors.
 */
export default function NotFound() {
  return (
    <section className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
      {/* Brass 404 mark — big enough to feel intentional, faded
          enough not to compete with the message. */}
      <p className="font-display text-7xl text-[var(--color-accent)]/50 md:text-8xl">
        404
      </p>
      <h1 className="font-display text-2xl md:text-3xl">
        الصفحة دي مش موجودة
      </h1>
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--color-text-secondary)]">
        Page not found
      </p>
      <p className="max-w-sm text-sm text-[var(--color-text-secondary)]">
        ممكن تكون اتنقلت أو الرابط فيه خطأ — جرّب تصفح المنتجات أو ارجع للرئيسية.
        <br />
        <span className="text-xs">
          The link may be broken — try browsing the catalog or heading home.
        </span>
      </p>

      {/* Two CTAs — home for "just get me out", catalog for the
          more likely intent (they came here to shop). */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-light)]"
        >
          <ArrowLeft className="h-4 w-4" />
          الرئيسية / Home
        </Link>
        <Link
          href="/ar/catalog"
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-6 py-3 text-sm font-medium text-[var(--color-text)] transition hover:border-[var(--color-accent)]"
        >
          <ShoppingBag className="h-4 w-4" />
          تصفّح المنتجات / Shop
        </Link>
      </div>
    </section>
  );
}
