/**
 * Africa/Cairo timezone helpers, shared by every admin report that has
 * to express "what date does this sale belong to". Egypt observes DST
 * again since 2023 (EEST UTC+3 Apr–Oct, EET UTC+2 Nov–Mar); the helpers
 * here look up the active offset via `Intl.DateTimeFormat` so callers
 * never have to hard-code +2/+3.
 *
 * Pure functions — safe in client or server bundles. We keep them
 * co-located with the query layer because that's the only consumer
 * today; promote to `lib/tz/` if the storefront ever needs them too.
 */

const CAIRO_TZ = "Africa/Cairo";

/**
 * UTC ms at which the given calendar Y-M-D begins in Cairo time. Pass
 * the components as plain numbers (1-indexed month, 1-indexed day) and
 * you get back a UTC instant suitable for `new Date(...).toISOString()`
 * → Supabase `.gte`/`.lt` filters.
 */
export function cairoMidnightUtcMs(
  y: number,
  m: number,
  d: number,
): number {
  // Probe Cairo's offset at noon the same day — well clear of the local
  // 02:00 DST transition, so we never accidentally read a half-hour
  // gap or a duplicated hour on the spring-forward / fall-back day.
  const probe = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const offsetHours = cairoOffsetHours(probe);
  return Date.UTC(y, m - 1, d, 0, 0, 0) - offsetHours * 3_600_000;
}

/** Cairo's signed offset (hours) ahead of UTC at the supplied instant. */
function cairoOffsetHours(at: Date): number {
  // Note: older Node ICU could render midnight wall-clock as "24" via
  // `hour: "2-digit", hour12: false` — but that only fires at exactly
  // local 24:00, and every caller here probes at noon UTC (Cairo
  // 14:00–15:00), so the case is unreachable. No guard needed.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CAIRO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(at);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  const wallMs = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return (wallMs - at.getTime()) / 3_600_000;
}

/**
 * YYYY-MM-DD that the supplied UTC instant falls on in Cairo. Used to
 * bucket sales rows by day after the SQL filter has narrowed the
 * window — slicing the UTC ISO string would put 00:00–03:00 Cairo sales
 * on the previous calendar day.
 */
export function cairoDateOf(input: string | Date): string {
  // en-CA renders dates as YYYY-MM-DD by default — saves us a manual
  // assemble from formatToParts.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CAIRO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(typeof input === "string" ? new Date(input) : input);
}

/**
 * Cairo's current calendar date as `{ y, m, d }` (1-indexed). Pass an
 * explicit `now` to test the helper without monkey-patching `Date`.
 *
 * Why a parts object instead of a string: the dashboard needs each
 * component separately to derive day-1-of-month and days-in-month
 * without re-parsing.
 */
export function cairoTodayParts(now: Date = new Date()): {
  y: number;
  m: number;
  d: number;
} {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CAIRO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) =>
    Number(parts.find((p) => p.type === t)?.value ?? 0);
  return { y: get("year"), m: get("month"), d: get("day") };
}

/**
 * YYYY-MM-DD for "today" in Cairo. Use this for any default-date
 * value that pre-fills a date picker or seeds a report range so the
 * picker shows the same calendar day the till and the dashboard
 * agree on, even between 22:00 Cairo and midnight UTC when the
 * server's `new Date()` already thinks tomorrow has started.
 */
export function cairoTodayISO(now: Date = new Date()): string {
  return cairoDateOf(now);
}

/**
 * ISO 8601 UTC instant at which Cairo midnight begins on the supplied
 * YYYY-MM-DD. Convenience wrapper around `cairoMidnightUtcMs` for the
 * common case of filtering a `timestamptz` column by a Cairo calendar
 * date: `.gte(cairoDayStartISO(from))` is "from this Cairo morning",
 * `.lt(cairoDayStartISO(to))` is "before this Cairo morning". Same
 * shape the old `${iso}T00:00:00.000Z` literal had, just Cairo-aligned.
 */
export function cairoDayStartISO(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(cairoMidnightUtcMs(y, m, d)).toISOString();
}
