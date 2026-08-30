"use client";

/**
 * Buffered event transport.
 *
 * Everything is same-origin, so no `credentials` option is needed and
 * sendBeacon — which cannot set one — just works. The cookies are HttpOnly and
 * ride along automatically; nothing here reads or needs them.
 */

type EventName = "page_view" | "view_item" | "select_item" | "add_to_cart";

type TrackInput = {
  name: EventName;
  productId?: string;
  searchId?: string;
  listId?: string;
  position?: number;
};

type QueuedEvent = TrackInput & {
  id: string;
  occurredAt: string;
  path: string;
  locale: string;
  referrerDomain?: string;
};

const ENDPOINT = "/api/events";
const FLUSH_AT = 10;
const IDLE_MS = 5_000;

let queue: QueuedEvent[] = [];
let idleTimer: ReturnType<typeof setTimeout> | null = null;
let listenersBound = false;
/** Only one flush in flight at a time; later flushes chain onto this. */
let inFlight: Promise<void> = Promise.resolve();

function localeFromPath(path: string): string {
  const seg = path.split("/")[1];
  return seg === "en" || seg === "ar" ? seg : "ar";
}

/** Only a genuinely external referrer counts. Internal navigation is not a referral. */
function referrerDomain(): string | undefined {
  if (!document.referrer) return undefined;
  try {
    const host = new URL(document.referrer).hostname;
    return host && host !== location.hostname ? host : undefined;
  } catch {
    return undefined;
  }
}

function send(events: QueuedEvent[]) {
  const body = JSON.stringify({ events });
  // A plain string, never a JSON-typed Blob. Only text/plain,
  // x-www-form-urlencoded and multipart/form-data are CORS-safelisted; a JSON
  // Blob triggers a preflight that may never complete once the page is gone.
  if (navigator.sendBeacon?.(ENDPOINT, body)) return Promise.resolve();
  return fetch(ENDPOINT, {
    method: "POST",
    body,
    keepalive: true,
    headers: { "content-type": "text/plain" },
  })
    .then(() => undefined)
    .catch(() => undefined);
}

export function flush() {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
  if (queue.length === 0) return inFlight;
  const batch = queue;
  queue = [];
  inFlight = inFlight.then(() => send(batch));
  return inFlight;
}

function bindLifecycle() {
  if (listenersBound || typeof document === "undefined") return;
  listenersBound = true;

  // Never unload/beforeunload: MDN calls them extremely unreliable and they
  // disable the back/forward cache. pagehide is the Safari fallback, and the
  // pair is guarded so one page teardown does not flush twice.
  let sent = false;
  const finalFlush = () => {
    if (sent) return;
    sent = true;
    flush();
    // Allow a later flush if the page is restored from bfcache.
    setTimeout(() => {
      sent = false;
    }, 0);
  };

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") finalFlush();
  });
  window.addEventListener("pagehide", finalFlush);
}

/**
 * Queue one event. Flushes at 10 events, after 5 s idle, and when the page is
 * hidden.
 *
 * Sending incrementally rather than hoarding one end-of-session beacon is
 * deliberate: a mobile page can be killed with no lifecycle event at all.
 */
export function track(input: TrackInput) {
  if (typeof window === "undefined") return;
  bindLifecycle();

  const path = location.pathname;
  queue.push({
    ...input,
    id: crypto.randomUUID(),
    occurredAt: new Date().toISOString(),
    path,
    locale: localeFromPath(path),
    referrerDomain: referrerDomain(),
  });

  if (queue.length >= FLUSH_AT) {
    flush();
    return;
  }
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(flush, IDLE_MS);
}
