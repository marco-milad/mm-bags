/**
 * Cloudflare Turnstile ("are you human?") — the pure decision logic, kept
 * free of `server-only` so it can be unit-tested. The server entry point is
 * lib/security/turnstile.ts; the widget is components/security/Turnstile.tsx.
 *
 * Off until BOTH keys are set (NEXT_PUBLIC_TURNSTILE_SITE_KEY for the widget,
 * TURNSTILE_SECRET_KEY for the check). Policy:
 *   - no secret configured      → pass (feature off)
 *   - token missing / rejected  → block
 *   - Cloudflare unreachable    → pass and log: losing a real order is worse
 *     than letting one bot through, and the rate limits still apply.
 */
export const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Form field / JSON key the token travels in. */
export const TURNSTILE_FIELD = "turnstileToken";

/** Turnstile tokens are at most 2048 characters. */
const MAX_TOKEN_LENGTH = 2048;

export const HUMAN_CHECK_FAILED = {
  ar: "معرفناش نتأكد إنك مش روبوت. حدّث الصفحة وحاول تاني.",
  en: "We couldn't confirm you're not a robot. Refresh the page and try again.",
} as const;

export type TurnstileDecision =
  | { ok: true; reason: "disabled" | "verified" | "unreachable" }
  | { ok: false; reason: "missing" | "rejected"; codes?: string[] };

export async function checkTurnstile(opts: {
  token: unknown;
  secret: string | undefined;
  ip?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}): Promise<TurnstileDecision> {
  const secret = opts.secret?.trim();
  if (!secret) return { ok: true, reason: "disabled" };

  const token = typeof opts.token === "string" ? opts.token.trim() : "";
  if (!token || token.length > MAX_TOKEN_LENGTH) return { ok: false, reason: "missing" };

  const body = new URLSearchParams({ secret, response: token });
  if (opts.ip && opts.ip !== "unknown") body.set("remoteip", opts.ip);

  let json: unknown;
  try {
    const res = await (opts.fetchImpl ?? fetch)(SITEVERIFY_URL, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(opts.timeoutMs ?? 5000),
    });
    if (!res.ok) return { ok: true, reason: "unreachable" };
    json = await res.json();
  } catch {
    return { ok: true, reason: "unreachable" };
  }

  const r = json as { success?: unknown; "error-codes"?: unknown };
  if (r?.success === true) return { ok: true, reason: "verified" };
  const codes = Array.isArray(r?.["error-codes"])
    ? (r["error-codes"] as unknown[]).filter((c): c is string => typeof c === "string")
    : undefined;
  // Our own misconfiguration (bad/missing secret) must not lock every
  // customer out: treat it like an outage and log loudly.
  if (codes?.some((c) => c === "invalid-input-secret" || c === "missing-input-secret")) {
    return { ok: true, reason: "unreachable" };
  }
  return { ok: false, reason: "rejected", codes };
}
