/**
 * Minimal in-process rate limiter for upload-style endpoints.
 *
 * Keyed on whatever string the caller passes (typically client IP
 * for anonymous routes; user id for authenticated ones). Stores a
 * rolling-window deque of recent attempt timestamps per key.
 *
 * Limits:
 *   - Process-local. Each Vercel function instance has its own map.
 *     For burst protection that's enough; for global per-account
 *     limits we'd need Upstash / Redis (out of scope here).
 *   - In-memory only — entries TTL out on access. We don't run a
 *     sweeper because the access pattern naturally trims stale keys.
 *   - Bounded total size via a soft cap (MAX_KEYS) — when reached we
 *     drop the least-recently-touched key. Keeps a runaway request
 *     volume from OOMing the function.
 */

const MAX_KEYS = 5_000;

type Window = number[]; // sorted-ascending timestamps in ms

const store = new Map<string, Window>();

function trim(window: Window, cutoff: number): Window {
  // Drop timestamps older than the rolling cutoff. In-place would be
  // microscopically faster but slice() returns a new array which is
  // safe for the caller.
  let i = 0;
  while (i < window.length && window[i] < cutoff) i++;
  return i === 0 ? window : window.slice(i);
}

/**
 * Returns `{ allowed: true }` when this attempt is under the cap,
 * `{ allowed: false, retryAfterSec }` otherwise. The attempt is
 * counted only when allowed (the caller's responsibility — we don't
 * try to be cute about half-spending the budget on rejection).
 *
 * @param key      identifier of the calling principal (IP, user id)
 * @param limit    max attempts within the window
 * @param windowMs rolling window length in ms
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: true } | { allowed: false; retryAfterSec: number } {
  const now = Date.now();
  const cutoff = now - windowMs;

  // Soft-evict the oldest key when the map grows past MAX_KEYS to
  // bound memory. Map preserves insertion order so the first key is
  // the least-recently-inserted; not strictly LRU but close enough
  // for a per-process bucket protector.
  if (store.size >= MAX_KEYS && !store.has(key)) {
    const firstKey = store.keys().next().value;
    if (firstKey !== undefined) store.delete(firstKey);
  }

  const existing = store.get(key) ?? [];
  const window = trim(existing, cutoff);

  if (window.length >= limit) {
    // Retry-After: how long until the oldest counted attempt rolls off.
    const oldest = window[0];
    const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    // Persist the trimmed window so we don't keep rescanning stale
    // entries on every rejected call.
    store.set(key, window);
    return { allowed: false, retryAfterSec };
  }

  window.push(now);
  store.set(key, window);
  return { allowed: true };
}

/**
 * Extract a best-effort client IP from the request headers. Vercel
 * sets x-forwarded-for as a comma-separated list, leftmost = client.
 * Falls back to "unknown" so the limiter still works (one big
 * "unknown" bucket is better than no protection).
 */
export function clientIpFromHeaders(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim() || "unknown";
  return headers.get("x-real-ip") || "unknown";
}
