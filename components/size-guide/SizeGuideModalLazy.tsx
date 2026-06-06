"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, type ReactNode } from "react";
import type { Locale } from "@/lib/i18n-config";

// Code-split the modal off the initial bundle. SSR is disabled so Radix Dialog's
// asChild-injected attributes (aria-controls="radix-:Rxxx:" etc.) never appear in
// the server HTML — they would otherwise mismatch the freshly-generated client
// IDs and trigger a hydration warning. `dynamic({ ssr: false })` is only valid
// inside a Client Component per Next.js 16 docs (lazy-loading.md).
const SizeGuideModalImpl = dynamic(
  () => import("./SizeGuideModal").then((m) => ({ default: m.SizeGuideModal })),
  { ssr: false },
);

/**
 * Server + first-client-render renders the bare trigger button (no Dialog
 * wrapper, no Radix attrs) so the HTML matches and the CTA is visible
 * immediately. After mount we swap in the real Dialog-wrapped modal — the
 * click handler attaches at that point. Typical delay is one paint frame.
 */
export function SizeGuideModalLazy({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <>{children}</>;
  return <SizeGuideModalImpl locale={locale}>{children}</SizeGuideModalImpl>;
}
