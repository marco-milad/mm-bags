"use client";

import { ChevronDown, MessageCircle, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { Locale } from "@/lib/i18n-config";
import {
  FAQ_CATEGORIES,
  FAQ_ITEMS,
  type FAQCategoryId,
  type FAQItem,
} from "@/lib/faq-data";
import { cn } from "@/lib/utils";

type ActiveTab = "all" | FAQCategoryId;

/**
 * FAQ page interactive shell. Owns:
 *   - the search query (matches Q + A in both languages — locale-agnostic
 *     so an English speaker can still find "شحن" if they type "ship")
 *   - the active category tab
 *   - the open/close state of each item (controlled, not <details>, so we
 *     can animate height with the grid-rows-[1fr] trick and so the open
 *     panel persists when the parent re-renders on tab change)
 *
 * The full Q&A list is always in the DOM (filtered items get `hidden`)
 * so the page is still indexable — search engines see every Q&A pair.
 */
export function FAQContent({ locale }: { locale: Locale }) {
  const isRTL = locale === "ar";

  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<ActiveTab>("all");
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const trimmedQuery = query.trim().toLowerCase();

  // Annotate every item with its `visible` flag once per render. Doing the
  // filter as a memo keeps the per-item render cheap and lets us also
  // compute the empty-state from the same source of truth.
  const annotated = useMemo(() => {
    return FAQ_ITEMS.map((item, originalIndex) => {
      const matchesTab = tab === "all" || item.category === tab;
      const haystack =
        `${item.qAr} ${item.qEn} ${item.aAr} ${item.aEn}`.toLowerCase();
      const matchesQuery = !trimmedQuery || haystack.includes(trimmedQuery);
      return { item, originalIndex, visible: matchesTab && matchesQuery };
    });
  }, [tab, trimmedQuery]);

  const visibleCount = annotated.filter((a) => a.visible).length;

  // WhatsApp handoff for the bottom CTA — matches the FAB number env var so
  // there's one source of truth for the brand's number.
  const waNumber = (
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "+201000000000"
  ).replace(/[^\d]/g, "");
  const waMessage = isRTL
    ? "أهلاً، عندي سؤال مش لاقي إجابته في الـ FAQ."
    : "Hi! I have a question I couldn't find an answer to in the FAQ.";
  const waHref = `https://wa.me/${waNumber}?text=${encodeURIComponent(waMessage)}`;

  return (
    <section className="mx-auto max-w-3xl px-4 pb-20 md:px-6">
      {/* Search */}
      <div className="relative">
        <Search
          aria-hidden
          className={cn(
            "pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-secondary)]",
            isRTL ? "right-4" : "left-4",
          )}
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={isRTL ? "دور على سؤالك..." : "Search questions..."}
          className={cn(
            "h-12 w-full rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] text-sm text-[var(--color-text)] shadow-sm transition focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30",
            isRTL ? "pr-11 pl-11 text-right" : "pl-11 pr-11",
          )}
          aria-label={isRTL ? "البحث في الأسئلة" : "Search the FAQ"}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label={isRTL ? "مسح" : "Clear"}
            className={cn(
              "absolute top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]",
              isRTL ? "left-3" : "right-3",
            )}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Category tabs — horizontal scroll on mobile, wraps at md+ */}
      <div className="mt-6 -mx-4 overflow-x-auto md:mx-0">
        <div className="flex w-max gap-2 px-4 md:w-auto md:flex-wrap md:px-0">
          <TabButton
            label={isRTL ? "كل الأسئلة" : "All"}
            active={tab === "all"}
            onClick={() => setTab("all")}
          />
          {FAQ_CATEGORIES.map((cat) => (
            <TabButton
              key={cat.id}
              label={isRTL ? cat.ar : cat.en}
              active={tab === cat.id}
              onClick={() => setTab(cat.id)}
            />
          ))}
        </div>
      </div>

      {/* Q&A list */}
      <ul className="mt-8 space-y-3">
        {annotated.map(({ item, originalIndex, visible }) => (
          <li
            key={originalIndex}
            className={visible ? undefined : "hidden"}
            // Even hidden items stay in the DOM so search engines index them.
          >
            <FAQAccordionItem
              item={item}
              locale={locale}
              isOpen={openIndex === originalIndex}
              onToggle={() =>
                setOpenIndex((prev) =>
                  prev === originalIndex ? null : originalIndex,
                )
              }
            />
          </li>
        ))}
      </ul>

      {/* Empty state */}
      {visibleCount === 0 && (
        <p className="mt-10 text-center text-sm text-[var(--color-text-secondary)]">
          {isRTL
            ? "مفيش نتائج لبحثك. جرب كلمة تانية أو شوف كل الأسئلة."
            : "No results for your search. Try another keyword or browse all."}
        </p>
      )}

      {/* WhatsApp CTA */}
      <div className="mt-14 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
        <h2 className="font-serif text-2xl text-[var(--color-text)]">
          {isRTL ? "مش لاقي إجابة؟" : "Didn't find your answer?"}
        </h2>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          {isRTL
            ? "تواصل معانا على WhatsApp وهنرد عليك في أسرع وقت."
            : "Message us on WhatsApp and we'll get back to you ASAP."}
        </p>
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-[var(--color-primary)] shadow-lg shadow-black/10 transition hover:scale-[1.02] hover:bg-[var(--color-accent-light)]"
        >
          <MessageCircle className="h-4 w-4" />
          {isRTL ? "تواصل معنا" : "Contact us"}
        </a>
      </div>
    </section>
  );
}

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wider transition",
        active
          ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
          : "border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-text)]",
      )}
    >
      {label}
    </button>
  );
}

function FAQAccordionItem({
  item,
  locale,
  isOpen,
  onToggle,
}: {
  item: FAQItem;
  locale: Locale;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const isRTL = locale === "ar";
  const question = isRTL ? item.qAr : item.qEn;
  const answer = isRTL ? item.aAr : item.aEn;

  return (
    <div
      className={cn(
        "rounded-xl border bg-[var(--color-bg)] transition-colors",
        isOpen
          ? "border-[var(--color-accent)] shadow-sm"
          : "border-[var(--color-border)]",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-start"
      >
        <span className="text-sm font-semibold text-[var(--color-text)] md:text-base">
          {question}
        </span>
        <ChevronDown
          aria-hidden
          className={cn(
            "h-4 w-4 shrink-0 text-[var(--color-text-secondary)] transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {/* Grid-rows trick: animates between 0fr (collapsed) and 1fr
          (auto height) without measuring the content. The inner div sets
          overflow-hidden so children clip during the transition. */}
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out",
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <p className="px-5 pb-5 text-sm leading-relaxed text-[var(--color-text-secondary)] md:text-[15px]">
            {answer}
          </p>
        </div>
      </div>
    </div>
  );
}
