"use client";

import { Plus } from "lucide-react";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { cn } from "@/lib/utils";

/**
 * Combobox-style text input: behaves exactly like a plain `<input>` for
 * the form (same `name`, same submitted value), but on focus shows a
 * dropdown of existing values pulled from the rest of the catalog.
 *
 * Behaviour:
 * - Typing filters the suggestion list as a case-insensitive substring
 *   match against the trimmed input.
 * - Click / Enter / Tab on a highlighted suggestion fills the input
 *   and closes the menu.
 * - Anything typed that doesn't match a suggestion is accepted as-is
 *   on blur or submit — this is the "add new value" path the admin
 *   needs when introducing a never-seen-before material / dimension.
 * - The list is capped at 8 visible options at once (scroll for more)
 *   so it never dominates the form on small screens.
 *
 * RTL-safe: the menu inherits the form's writing direction. We don't
 * mirror the icon or anchor because the menu width tracks the input.
 */
export function SuggestInput({
  id,
  name,
  defaultValue,
  suggestions,
  required,
  placeholder,
  dir,
  className,
  isAr,
}: {
  id: string;
  name: string;
  defaultValue?: string;
  suggestions: ReadonlyArray<string>;
  required?: boolean;
  placeholder?: string;
  dir?: "rtl" | "ltr";
  className?: string;
  isAr: boolean;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  // `delay-close` so a click on a <li> registers before blur shuts the
  // menu. Otherwise the click target unmounts mid-event.
  const closeTimerRef = useRef<number | null>(null);
  const listboxId = useId();

  // Filter: case-insensitive substring on the normalised value. Empty
  // input shows everything (useful when admin opens the field fresh
  // and wants to see what's already on offer).
  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return suggestions;
    return suggestions.filter((s) => s.toLowerCase().includes(q));
  }, [value, suggestions]);

  // A typed value that doesn't match any existing suggestion is a
  // brand-new value — surface it as the first "create" row so the
  // admin sees explicit confirmation that it'll be saved as entered.
  const trimmed = value.trim();
  const isNewValue =
    trimmed.length > 0 &&
    !suggestions.some((s) => s.toLowerCase() === trimmed.toLowerCase());

  // Reset the highlight whenever the displayed list changes so the
  // arrow keys don't land on a removed row.
  useEffect(() => {
    setHighlight(0);
  }, [value, open]);

  function pick(v: string) {
    setValue(v);
    setOpen(false);
    inputRef.current?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      e.preventDefault();
      return;
    }
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      // Only intercept when an existing suggestion is highlighted; for
      // a brand-new typed value let Enter submit the surrounding form
      // (the default <input> behaviour).
      if (!isNewValue && filtered.length > 0) {
        e.preventDefault();
        pick(filtered[highlight] ?? "");
      } else {
        setOpen(false);
      }
    }
  }

  function onFocus() {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setOpen(true);
  }

  function onBlur() {
    // Defer so a <li> mousedown lands first; pick() will refocus and
    // we cancel the timer above.
    closeTimerRef.current = window.setTimeout(() => setOpen(false), 120);
  }

  const showMenu = open && (filtered.length > 0 || isNewValue);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="text"
        role="combobox"
        // eslint-disable-next-line jsx-a11y/aria-proptypes -- stringified boolean
        aria-expanded={showMenu ? "true" : "false"}
        aria-controls={listboxId}
        aria-autocomplete="list"
        autoComplete="off"
        required={required}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        dir={dir}
        className={className}
      />
      {showMenu && (
        <ul
          id={listboxId}
          role="listbox"
          dir={dir}
          // Mousedown (not click) so the option fires before the input
          // blurs and tears down the menu.
          className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] py-1 text-sm shadow-lg"
        >
          {filtered.map((s, i) => {
            const active = i === highlight && !isNewValue;
            return (
              <li
                key={s}
                role="option"
                // eslint-disable-next-line jsx-a11y/aria-proptypes -- stringified
                aria-selected={active ? "true" : "false"}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(s);
                }}
                onMouseEnter={() => setHighlight(i)}
                className={cn(
                  "cursor-pointer px-3 py-1.5",
                  active
                    ? "bg-[var(--color-accent)]/15 text-[var(--color-text)]"
                    : "text-[var(--color-text)] hover:bg-[var(--color-surface)]",
                )}
              >
                {s}
              </li>
            );
          })}
          {isNewValue && (
            <li
              role="option"
              // eslint-disable-next-line jsx-a11y/aria-proptypes
              aria-selected="true"
              onMouseDown={(e) => e.preventDefault()}
              className="flex items-center gap-1.5 border-t border-[var(--color-border)] px-3 py-1.5 text-[var(--color-text-secondary)]"
            >
              <Plus className="h-3 w-3 text-[var(--color-accent)]" />
              <span>
                {isAr ? "إضافة قيمة جديدة: " : "Add new value: "}
                <strong className="text-[var(--color-text)]">{trimmed}</strong>
              </span>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
