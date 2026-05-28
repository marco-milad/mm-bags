"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { defaultLocale, locales, type Locale } from "@/lib/i18n-config";

export function LocaleSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname() ?? `/${locale}`;
  const other = locales.find((l) => l !== locale) ?? defaultLocale;
  const swapped = pathname.replace(new RegExp(`^/${locale}`), `/${other}`);

  return (
    <Link
      href={swapped}
      prefetch={false}
      className="ml-1 rounded-full border border-[var(--color-border)] px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-[var(--color-text-secondary)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-text)]"
    >
      {other === "ar" ? "ع" : "EN"}
    </Link>
  );
}
