import "server-only";

/**
 * Minimal Twilio WhatsApp sender. We hit the REST API directly with
 * `fetch` instead of pulling in the `twilio` SDK — the SDK is a 1+MB
 * tree-shake unfriendly dep, and we only need one endpoint.
 *
 * Required env vars (already declared in .env.example):
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_WHATSAPP_FROM   e.g. `whatsapp:+14155238886`
 *
 * NEVER log `token` or the Authorization header — Auth Token is a
 * long-lived bearer credential.
 */

const TWILIO_SANDBOX_FROM = "whatsapp:+14155238886";

export type WhatsAppSendResult =
  | { ok: true; sid: string }
  | { ok: false; error: string };

/**
 * Normalises an Egyptian phone to E.164. Returns null if the input
 * can't be confidently mapped. Storefront forms accept `01XXXXXXXXX`
 * (local 11-digit format) — Twilio needs `+201XXXXXXXXX`. Without
 * this normaliser every send to a real customer fails with a 400 and
 * the action wrappers swallow the error.
 */
function toE164Egypt(raw: string): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("00")) return "+" + digits.slice(2);
  // Egyptian local: 01[0125]\d{8}
  if (/^01[0125]\d{8}$/.test(digits)) return "+20" + digits.slice(1);
  // Already country-coded but missing +
  if (/^201[0125]\d{8}$/.test(digits)) return "+" + digits;
  return null;
}

export async function sendWhatsApp(opts: {
  to: string; // E.164 phone, with or without "whatsapp:" prefix
  body: string;
}): Promise<WhatsAppSendResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_WHATSAPP_FROM?.trim();

  if (!sid || !token || !from) {
    return { ok: false, error: "twilio_not_configured" };
  }

  // Hard guard: refuse to use the public sandbox From in production —
  // it would silently fail (or worse, send via Twilio's shared sandbox)
  // for every customer who hasn't joined the sandbox via the
  // `join <code>` opt-in. See the adversarial review.
  const isProd =
    process.env.VERCEL_ENV === "production" ||
    process.env.NODE_ENV === "production";
  if (
    isProd &&
    (from === TWILIO_SANDBOX_FROM || from === "+14155238886")
  ) {
    return { ok: false, error: "twilio_sandbox_from_blocked" };
  }

  // Normalise recipient to E.164. The storefront stores Egyptian
  // local format (01XXXXXXXXX); Twilio rejects anything that isn't
  // E.164.
  const rawTo = opts.to.replace(/^whatsapp:/, "");
  const e164 = toE164Egypt(rawTo);
  if (!e164) {
    return { ok: false, error: "invalid_phone" };
  }
  const toAddr = `whatsapp:${e164}`;
  const fromAddr = from.startsWith("whatsapp:") ? from : `whatsapp:${from}`;

  const form = new URLSearchParams();
  form.set("To", toAddr);
  form.set("From", fromAddr);
  form.set("Body", opts.body);

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`,
      {
        method: "POST",
        headers: {
          // Basic auth — Twilio accepts AccountSid:AuthToken.
          // NEVER log this header value.
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
        signal: AbortSignal.timeout(10_000),
      },
    );
    const json = (await res.json().catch(() => ({}))) as {
      sid?: string;
      code?: number;
      status?: number;
    };
    if (!res.ok || !json.sid) {
      // Surface the numeric Twilio code only, not the human-readable
      // message — Twilio's `more_info` URL and message can include
      // request context we don't want forwarded.
      return {
        ok: false,
        error: `twilio_${json.code ?? res.status}`,
      };
    }
    return { ok: true, sid: json.sid };
  } catch (err) {
    // Twilio error stacks from `fetch` can embed the request URL
    // (which contains the AccountSid). Drop the raw err to keep logs
    // clean — only surface the error name.
    const name = err instanceof Error ? err.name : "unknown";
    return { ok: false, error: `twilio_fetch_${name}` };
  }
}
