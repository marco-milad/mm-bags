"use client";

import { useEffect, useState } from "react";
import type { Live } from "@/lib/admin/analytics";

const LABEL: Record<string, { ar: string; en: string }> = {
  page_view: { ar: "فتح صفحة", en: "Page view" },
  search: { ar: "بحث", en: "Search" },
  view_item: { ar: "فتح منتج", en: "Product opened" },
  select_item: { ar: "ضغط نتيجة", en: "Result clicked" },
  add_to_cart: { ar: "أضاف للسلة", en: "Added to cart" },
  purchase: { ar: "اشترى 🎉", en: "Purchased 🎉" },
};

function timeAgo(iso: string, isAr: boolean): string {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return isAr ? `${s} ث` : `${s}s`;
  return isAr ? `${Math.round(s / 60)} د` : `${Math.round(s / 60)}m`;
}

/**
 * Live view. Polls every 10 s and is independent of the range filter.
 *
 * The cheapest thing on this page and the one that gets opened daily, which is
 * why it is built first and sits at the top.
 */
export function LivePanel({ initial, isAr }: { initial: Live; isAr: boolean }) {
  const [live, setLive] = useState<Live>(initial);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch("/admin/analytics/live", { cache: "no-store" });
        if (!res.ok) return;
        const next = (await res.json()) as Live;
        if (!cancelled) setLive(next);
      } catch {
        // A dropped poll is not worth surfacing; the next one will catch up.
      }
    };
    const id = setInterval(tick, 10_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-[var(--color-text)]">
          {isAr ? "الآن" : "Live"}
        </h2>
        <span className="text-[11px] text-[var(--color-text-secondary)]">
          {isAr ? "يتحدّث كل 10 ثوانٍ" : "refreshes every 10s"}
        </span>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="relative flex h-2.5 w-2.5">
          {live.activeNow > 0 && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-success)] opacity-60" />
          )}
          <span
            className="relative inline-flex h-2.5 w-2.5 rounded-full"
            style={{
              background:
                live.activeNow > 0 ? "var(--color-success)" : "var(--color-border-dark)",
            }}
          />
        </span>
        <span className="font-mono text-3xl font-semibold text-[var(--color-text)]">
          {live.activeNow}
        </span>
        <span className="text-xs text-[var(--color-text-secondary)]">
          {isAr ? "زائر نشِط في آخر 5 دقائق" : "active in the last 5 minutes"}
        </span>
      </div>

      <ul className="mt-4 space-y-1.5">
        {live.events.length === 0 && (
          <li className="rounded-lg border border-dashed border-[var(--color-border)] px-3 py-6 text-center text-xs text-[var(--color-text-secondary)]">
            {isAr
              ? "لا نشاط في آخر 30 دقيقة."
              : "Nothing in the last 30 minutes."}
          </li>
        )}
        {live.events.map((e, i) => (
          <li
            key={`${e.occurred_at}-${i}`}
            className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs"
          >
            <code className="shrink-0 font-mono text-[10px] text-[var(--color-text-secondary)]">
              {e.visitor}
            </code>
            <span className="shrink-0 font-medium text-[var(--color-text)]">
              {isAr ? LABEL[e.name]?.ar : LABEL[e.name]?.en}
            </span>
            {/* dir="auto" so an Arabic query renders right-to-left inside an
                otherwise left-to-right row. */}
            {e.query_raw && (
              <span dir="auto" className="truncate text-[var(--color-text)]">
                “{e.query_raw}”
                <span className="ms-1 text-[var(--color-text-secondary)]">
                  {e.result_count === 0
                    ? isAr
                      ? "— مفيش نتائج"
                      : "— nothing found"
                    : isAr
                      ? `— ${e.result_count} نتيجة`
                      : `— ${e.result_count} results`}
                </span>
              </span>
            )}
            {!e.query_raw && e.path && (
              <span dir="auto" className="truncate text-[var(--color-text-secondary)]">
                {e.path}
              </span>
            )}
            <span className="ms-auto shrink-0 font-mono text-[10px] text-[var(--color-text-secondary)]">
              {timeAgo(e.occurred_at, isAr)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
