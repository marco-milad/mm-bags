import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--color-text-secondary)]">
        404
      </p>
      <h1 className="font-display text-3xl">الصفحة دي مش موجودة</h1>
      <p className="text-sm text-[var(--color-text-secondary)]">
        ممكن تكون اتنقلت أو الرابط فيه خطأ.
      </p>
      <Link
        href="/"
        className="mt-4 rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-light)]"
      >
        رجوع للرئيسية
      </Link>
    </section>
  );
}
