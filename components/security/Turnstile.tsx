"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HUMAN_CHECK_FAILED } from "@/lib/security/turnstile-core";

/**
 * Cloudflare Turnstile widget + hook. Renders nothing (and every form works
 * as before) until NEXT_PUBLIC_TURNSTILE_SITE_KEY is set. Uses
 * appearance "interaction-only": most visitors never see it; Cloudflare only
 * shows a checkbox when it is unsure.
 *
 * Usage:
 *   const human = useTurnstile();            // or useTurnstile({ eager: true })
 *   <form onFocusCapture={human.activate}>   // load Cloudflare on first use
 *   ...
 *   const token = await human.getToken();    // waits for the check if needed
 *   if (human.blocked(token)) { setError(...HUMAN_CHECK_FAILED); return; }
 *   await action(input, token); human.reset();   // tokens are single-use
 *   <TurnstileWidget locale={locale} control={human} />
 *
 * A shopper who presses submit before Cloudflare answers just waits a moment
 * (the button keeps spinning); they never have to press twice.
 *
 * Lazy by default: the script only loads once the visitor focuses the form,
 * so the home and product pages (newsletter, reviews) don't pay for it.
 */
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || "";
export const turnstileEnabled = SITE_KEY.length > 0;

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<TurnstileApi> | null = null;
function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  scriptPromise ??= new Promise<TurnstileApi>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile missing")));
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error("turnstile script failed"));
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

/** How long a submit waits for Cloudflare before giving up. */
const TOKEN_WAIT_MS = 15_000;

export type TurnstileControl = {
  /**
   * The token for this submission: null at once when Turnstile is off,
   * otherwise waits (up to 15 s) for the check to finish. Null on timeout.
   */
  getToken: () => Promise<string | null>;
  /** True when Turnstile is on and no token came back: don't submit. */
  blocked: (token: string | null) => boolean;
  /** Get a fresh token after a submission (each token works once). */
  reset: () => void;
  /** Start loading the check (call on first focus of the form). */
  activate: () => void;
  /** @internal wiring between the hook and the widget. */
  _setToken: (t: string | null) => void;
  _resetKey: number;
  _active: boolean;
};

export function useTurnstile({ eager = false }: { eager?: boolean } = {}): TurnstileControl {
  const tokenRef = useRef<string | null>(null);
  const waiters = useRef<Array<(t: string | null) => void>>([]);
  const [resetKey, setResetKey] = useState(0);
  const [active, setActive] = useState(eager);

  const setToken = useCallback((t: string | null) => {
    tokenRef.current = t;
    if (t) {
      const pending = waiters.current;
      waiters.current = [];
      pending.forEach((resolve) => resolve(t));
    }
  }, []);
  const reset = useCallback(() => {
    tokenRef.current = null;
    setResetKey((k) => k + 1);
  }, []);
  const activate = useCallback(() => setActive(true), []);
  const getToken = useCallback(async () => {
    if (!turnstileEnabled) return null;
    if (tokenRef.current) return tokenRef.current;
    setActive(true);
    return new Promise<string | null>((resolve) => {
      waiters.current.push(resolve);
      setTimeout(() => {
        waiters.current = waiters.current.filter((w) => w !== resolve);
        resolve(tokenRef.current);
      }, TOKEN_WAIT_MS);
    });
  }, []);

  return {
    getToken,
    blocked: (t) => turnstileEnabled && !t,
    reset,
    activate,
    _setToken: setToken,
    _resetKey: resetKey,
    _active: active,
  };
}

export function TurnstileWidget({
  locale,
  control,
  action,
}: {
  locale: "ar" | "en";
  control: TurnstileControl;
  /** Shown in Cloudflare analytics, e.g. "checkout". */
  action?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [failed, setFailed] = useState(false);
  const { _setToken: setToken, _resetKey: resetKey, _active: active } = control;

  useEffect(() => {
    if (!turnstileEnabled || !active || !box.current) return;
    let cancelled = false;
    loadTurnstile()
      .then((ts) => {
        if (cancelled || !box.current) return;
        widgetId.current = ts.render(box.current, {
          sitekey: SITE_KEY,
          action,
          language: locale,
          appearance: "interaction-only",
          callback: (t: string) => {
            setFailed(false);
            setToken(t);
          },
          "expired-callback": () => setToken(null),
          "error-callback": () => {
            setToken(null);
            setFailed(true);
          },
        });
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      if (widgetId.current) window.turnstile?.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [locale, action, setToken, active]);

  // A used token is spent: ask Cloudflare for a new one.
  useEffect(() => {
    if (resetKey > 0 && widgetId.current) window.turnstile?.reset(widgetId.current);
  }, [resetKey]);

  if (!turnstileEnabled) return null;
  return (
    <div>
      <div ref={box} />
      {failed && (
        <p role="alert" className="mt-2 text-xs text-[var(--color-error)]">
          {locale === "ar" ? HUMAN_CHECK_FAILED.ar : HUMAN_CHECK_FAILED.en}
        </p>
      )}
    </div>
  );
}
