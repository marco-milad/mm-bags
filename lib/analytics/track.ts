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
  // Campaign params from the landing URL — sent on page_view only. Channel is
  // derived server-side from these plus the referrer.
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
};

/** Anonymous-only: the banner decision, counted without any id. */
type ConsentEventName = "consent_accepted" | "consent_rejected";

type QueuedEvent = Omit<TrackInput, "name"> & {
  name: EventName | ConsentEventName;
  id: string;
  occurredAt: string;
  path: string;
  locale: string;
  referrerDomain?: string;
};

/**
 * Consent is readable from the client because the decision cookie is
 * deliberately NOT HttpOnly — unlike mm_vid, it carries no identity, and the
 * page needs it to decide whether to render the banner and how to emit.
 *
 * With consent, events go to /api/events and carry the visitor/session
 * cookies. Without it (declined OR not answered), events go to
 * /api/events/anon: no cookies are set or read for identity, nothing is
 * written to the device, and the only link between events is `visitKey`,
 * a random id that lives in this tab's memory and dies with it — so one
 * visit's path is measurable, but a return visit can never be recognised.
 * The server enforces both rules; this file only routes.
 */
function consentGranted(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split("; ")
    .some((c) => c === "mm_consent=accepted");
}

/**
 * The browser's "do not sell or share" signal. Honoured as a full opt-out:
 * a visitor sending it is not counted even anonymously.
 */
function globalPrivacyControl(): boolean {
  return typeof navigator !== "undefined" &&
    (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
}

/** Random per open tab; never persisted. Survives client-side navigation only. */
let visitKey: string | null = null;
function currentVisitKey(): string {
  visitKey ??= crypto.randomUUID();
  return visitKey;
}

const ENDPOINT = "/api/events";
const ANON_ENDPOINT = "/api/events/anon";
const FLUSH_AT = 10;
const IDLE_MS = 5_000;

let queue: QueuedEvent[] = [];
let anonQueue: QueuedEvent[] = [];
let idleTimer: ReturnType<typeof setTimeout> | null = null;
let listenersBound = false;
/** Only one flush in flight at a time; later flushes chain onto this. */
let inFlight: Promise<void> = Promise.resolve();

/** The private order link's token (/<locale>/o/<token>) works like a password: never send it. */
function currentPath(): string {
  return location.pathname.replace(/^(\/(?:ar|en)\/o\/)[^/]+/, "$1-");
}

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

function send(events: QueuedEvent[], anon = false) {
  const endpoint = anon ? ANON_ENDPOINT : ENDPOINT;
  const body = JSON.stringify(anon ? { visitKey: currentVisitKey(), events } : { events });
  // A plain string, never a JSON-typed Blob. Only text/plain,
  // x-www-form-urlencoded and multipart/form-data are CORS-safelisted; a JSON
  // Blob triggers a preflight that may never complete once the page is gone.
  if (navigator.sendBeacon?.(endpoint, body)) return Promise.resolve();
  return fetch(endpoint, {
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
  if (queue.length === 0 && anonQueue.length === 0) return inFlight;
  const batch = queue;
  const anonBatch = anonQueue;
  queue = [];
  anonQueue = [];
  inFlight = inFlight.then(async () => {
    if (batch.length) await send(batch);
    if (anonBatch.length) await send(anonBatch, true);
  });
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
  if (globalPrivacyControl()) return;
  // Unknown and rejected both go anonymous. Absence of a decision is never a yes.
  const anon = !consentGranted();
  bindLifecycle();

  const path = currentPath();
  const event: QueuedEvent = {
    ...input,
    // A search id would tie this event to the (consent-only) search log.
    ...(anon ? { searchId: undefined } : {}),
    id: crypto.randomUUID(),
    occurredAt: new Date().toISOString(),
    path,
    locale: localeFromPath(path),
    referrerDomain: referrerDomain(),
  };
  (anon ? anonQueue : queue).push(event);

  if (queue.length + anonQueue.length >= FLUSH_AT) {
    flush();
    return;
  }
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(flush, IDLE_MS);
}

/**
 * Count the banner decision itself, anonymously (no id), so the dashboard
 * can show the acceptance rate. Sent at once: the page may navigate next.
 */
export function trackConsentDecision(decision: "accepted" | "rejected") {
  if (typeof window === "undefined" || globalPrivacyControl()) return;
  const path = currentPath();
  void send(
    [
      {
        name: decision === "accepted" ? "consent_accepted" : "consent_rejected",
        id: crypto.randomUUID(),
        occurredAt: new Date().toISOString(),
        path,
        locale: localeFromPath(path),
      },
    ],
    true,
  );
}