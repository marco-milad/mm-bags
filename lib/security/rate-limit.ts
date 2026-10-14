import "server-only";

import { headers } from "next/headers";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { rateLimit as memoryRateLimit } from "@/lib/uploads/rate-limit";
import { LIMITS, isLoopbackIp, limitKey, pickClientIp, type LimitName } from "@/lib/security/limits";

export type LimitResult = { ok: true } | { ok: false; retryAfterSec: number };

let warnedFallback = false;

/**
 * Counts one hit against `name` for `identity` and says whether it's allowed.
 *
 * Uses the shared Postgres counter (migration 0027) so every server instance
 * sees the same totals. If that call fails — function not deployed yet, or a
 * transient DB error — it falls back to the per-instance in-memory limiter
 * rather than blocking real shoppers or dropping protection entirely.
 */
export async function hitLimit(name: LimitName, identity: string): Promise<LimitResult> {
  // Local runs (next start on this machine, the e2e suite) share one
  // loopback "IP"; per-IP budgets would only block the test suite.
  if (name.endsWith("PerIp") && isLoopbackIp(identity)) return { ok: true };
  const { max, windowSeconds } = LIMITS[name];
  const key = limitKey(name, identity);
  try {
    const { data, error } = await getSupabaseAdminClient().rpc("rate_limit_hit", {
      p_key: key,
      p_window_seconds: windowSeconds,
      p_max: max,
    });
    if (error) throw new Error(error.message);
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error("no row");
    return row.allowed ? { ok: true } : { ok: false, retryAfterSec: row.retry_after };
  } catch (e) {
    if (!warnedFallback) {
      warnedFallback = true;
      console.warn(`[rate-limit] shared limiter unavailable, using in-memory fallback: ${(e as Error).message}`);
    }
    const mem = memoryRateLimit(key, max, windowSeconds * 1000);
    return mem.allowed ? { ok: true } : { ok: false, retryAfterSec: mem.retryAfterSec };
  }
}

/**
 * Client IP for server actions / route handlers. x-real-ip first: Vercel's
 * edge sets it to the connecting client, whereas a client can prepend its own
 * values to x-forwarded-for.
 */
export async function requestIp(): Promise<string> {
  const h = await headers();
  return pickClientIp(h.get("x-real-ip"), h.get("x-forwarded-for"));
}

/** Same as requestIp() for route handlers that already hold the Request. */
export function ipFromRequest(request: Request): string {
  return pickClientIp(request.headers.get("x-real-ip"), request.headers.get("x-forwarded-for"));
}

/** Checks several limits; the first one exceeded wins. All are counted. */
export async function hitLimits(
  checks: ReadonlyArray<[LimitName, string]>,
): Promise<LimitResult> {
  const results = await Promise.all(checks.map(([name, id]) => hitLimit(name, id)));
  return results.find((r) => !r.ok) ?? { ok: true };
}
