"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { Locale } from "@/lib/i18n-config";

/**
 * "Load more" for the catalog grid — the URL is the single source of
 * truth. Clicking replaces the URL with `?page=N+1` (soft navigation,
 * scroll preserved); the server re-renders the page with pages 1..N+1
 * and React keeps the cards already on screen (same keys), so new rows
 * simply appear under the old ones. Because the rendered tree always
 * matches the URL, refresh, shared links, and Back/Forward all show
 * exactly what the customer had loaded — no client-side page state, no
 * duplicate or missing products by construction. `replace` (not push)
 * so Back leaves the catalog in one step instead of unwinding loads.
 */
export function LoadMoreProducts({
  locale,
  nextPage,
  hasMore,
  total,
  shown,
}: {
  locale: Locale;
  /** Page number to request on click (pages already rendered + 1). */
  nextPage: number;
  hasMore: boolean;
  total: number;
  shown: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const isRTL = locale === "ar";

  const loadMore = () => {
    if (pending || !hasMore) return;
    const next = new URLSearchParams(searchParams?.toString());
    next.set("page", String(nextPage));
    startTransition(() => {
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    });
  };

  return (
    <div className="mt-10 flex flex-col items-center gap-3">
      <p className="text-xs text-[var(--color-text-secondary)]">
        {isRTL
          ? `عرض ${Math.min(shown, total)} من ${total} منتج`
          : `Showing ${Math.min(shown, total)} of ${total} products`}
      </p>
      {hasMore && (
        <button
          type="button"
          onClick={loadMore}
          disabled={pending}
          aria-busy={pending}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--color-primary)] px-6 py-2.5 text-sm font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)] hover:text-white disabled:opacity-60"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {pending
            ? isRTL
              ? "جارٍ التحميل…"
              : "Loading…"
            : isRTL
              ? "عرض المزيد"
              : "Load more"}
        </button>
      )}
    </div>
  );
}
