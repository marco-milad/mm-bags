"use client";

import { Languages } from "lucide-react";
import { useTransition } from "react";
import { setAdminLocale } from "@/lib/admin/locale-actions";
import type { AdminLocale } from "@/lib/admin/locale";
import { cn } from "@/lib/utils";

/**
 * AR/EN pill toggle. Renders both labels; the active one gets the brass
 * background, the inactive one is a button that fires the server action
 * to flip the cookie. Wrapped in `useTransition` so the click doesn't
 * block the UI while the layout revalidates.
 */
export function AdminLocaleSwitcher({ locale }: { locale: AdminLocale }) {
  const [pending, startTransition] = useTransition();

  function pick(next: AdminLocale) {
    if (next === locale || pending) return;
    const fd = new FormData();
    fd.set("locale", next);
    startTransition(async () => {
      await setAdminLocale(fd);
    });
  }

  return (
    <div
      className="inline-flex items-center gap-1 rounded-full border border-navy-700 bg-navy-800/60 px-1 py-0.5"
      role="group"
      aria-label="Language"
    >
      <Languages
        className="ms-1 h-3.5 w-3.5 text-paper/50"
        aria-hidden
      />
      {(["ar", "en"] as const).map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => pick(opt)}
          disabled={pending}
          aria-pressed={locale === opt}
          className={cn(
            "rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider transition",
            locale === opt
              ? "bg-brass-500 text-navy-900"
              : "text-paper/70 hover:text-paper",
            pending && "opacity-50",
          )}
        >
          {opt === "ar" ? "ع" : "EN"}
        </button>
      ))}
    </div>
  );
}
