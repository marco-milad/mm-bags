"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import { setConsent } from "@/lib/analytics/consent-actions";
import type { ConsentState } from "@/lib/analytics/identity";
import type { Locale } from "@/lib/i18n-config";

/**
 * The decision is read here on the client rather than passed down from the
 * layout, and that is not a stylistic choice.
 *
 * Reading cookies() in the [locale] layout would opt every route in the app
 * back into dynamic rendering and undo the eight prerendered content pages —
 * the layout was made cookie-free precisely to allow them to be static. So the
 * banner asks the browser instead.
 *
 * The cost is that it cannot render in the first server paint, which is fine:
 * it is fixed-positioned, so appearing a frame later moves nothing.
 */
function readConsentCookie(): ConsentState {
  if (typeof document === "undefined") return "unknown";
  const hit = document.cookie
    .split("; ")
    .find((c) => c.startsWith("mm_consent="));
  const value = hit?.slice("mm_consent=".length);
  return value === "accepted" || value === "rejected" ? value : "unknown";
}

/** The cookie cannot change under us mid-page, so there is nothing to watch. */
const noSubscribe = () => () => {};
const askOnClient = () => readConsentCookie() === "unknown";
/** Server snapshot: never render during SSR, so hydration always agrees. */
const askOnServer = () => false;

/**
 * Asks the analytics question. It does not enforce the answer.
 *
 * Enforcement lives in proxy.ts, /api/events and logSearch, so a visitor who
 * blocks this component, dismisses it, or never sees it is tracked exactly as
 * much as one who declined: not at all. That separation is the point — a
 * banner that is also the gate fails open every time it fails.
 *
 * Fixed to the bottom rather than inline: it must not push page content and
 * reintroduce the layout shift just removed from the cart and checkout. It
 * also sits above the mobile tab bar rather than over it, so the primary
 * navigation stays reachable while the question is open.
 *
 * Neither button is pre-selected and neither is styled as the obvious default.
 * Dismissing without choosing is not offered at all: there is no X, because a
 * close button that leaves the state "unknown" reads as a way to make the
 * question go away, and one that silently means yes would be worse.
 */
export function ConsentBanner({ locale }: { locale: Locale }) {
  const isAr = locale === "ar";
  // useSyncExternalStore rather than an effect: the server snapshot is always
  // false, so nothing renders during SSR and hydration cannot disagree, and
  // the client reads the real cookie on its first commit. An effect that
  // called setState on mount would do the same job with an extra render and
  // trip react-hooks/set-state-in-effect.
  const ask = useSyncExternalStore(noSubscribe, askOnClient, askOnServer);
  const [answered, setAnswered] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!ask || answered) return null;

  const choose = (decision: ConsentState) => {
    // Optimistic: the answer is recorded server-side, but the banner should
    // close the moment it is clicked rather than after the round trip.
    setAnswered(true);
    startTransition(() => {
      void setConsent(decision);
    });
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={isAr ? "إعدادات التحليلات" : "Analytics preferences"}
      className="fixed inset-x-0 bottom-16 z-50 mx-auto max-w-2xl px-3 pb-3 md:bottom-3"
    >
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 shadow-lg md:flex md:items-center md:gap-5">
        <p className="text-xs leading-relaxed text-[var(--color-text)] md:flex-1">
          {isAr
            ? "بنستخدم كوكيز تحليلات عشان نعرف الصفحات اللي بتتزار والكلمات اللي بتتبحث. مش هنشغّلها غير لما توافق، ومفيش إعلانات ولا مشاركة مع أي طرف تاني."
            : "We use analytics cookies to see which pages get visited and what people search for. Nothing runs until you agree, and nothing is used for advertising or shared with anyone."}{" "}
          <Link
            href={`/${locale}/privacy-policy`}
            className="underline underline-offset-2 hover:text-[var(--color-primary)]"
          >
            {isAr ? "اعرف أكتر" : "Learn more"}
          </Link>
        </p>

        <div className="mt-3 flex gap-2 md:mt-0 md:shrink-0">
          {/* Equal weight on purpose: refusing must be exactly as easy as
              agreeing, and neither is the default. */}
          <button
            type="button"
            onClick={() => choose("rejected")}
            disabled={pending}
            className="min-h-11 flex-1 rounded-full border border-[var(--color-border-dark)] px-5 text-xs font-semibold text-[var(--color-text)] transition hover:bg-[var(--color-surface)] disabled:opacity-60 md:flex-none"
          >
            {isAr ? "لا شكرًا" : "No thanks"}
          </button>
          <button
            type="button"
            onClick={() => choose("accepted")}
            disabled={pending}
            className="min-h-11 flex-1 rounded-full bg-[var(--color-primary)] px-5 text-xs font-semibold text-white transition hover:bg-[var(--color-primary-light)] disabled:opacity-60 md:flex-none"
          >
            {isAr ? "موافق" : "Accept"}
          </button>
        </div>
      </div>
    </div>
  );
}
