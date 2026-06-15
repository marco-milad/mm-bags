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
 */

export type WhatsAppSendResult =
  | { ok: true; sid: string }
  | { ok: false; error: string };

export async function sendWhatsApp(opts: {
  to: string; // E.164 phone, with or without "whatsapp:" prefix
  body: string;
}): Promise<WhatsAppSendResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;

  if (!sid || !token || !from) {
    return {
      ok: false,
      error: "TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_WHATSAPP_FROM not set",
    };
  }

  // Twilio expects each address prefixed with `whatsapp:`. Normalise so
  // callers don't have to remember.
  const toAddr = opts.to.startsWith("whatsapp:") ? opts.to : `whatsapp:${opts.to}`;
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
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
      },
    );
    const json = (await res.json()) as { sid?: string; message?: string };
    if (!res.ok || !json.sid) {
      return { ok: false, error: json.message ?? `Twilio ${res.status}` };
    }
    return { ok: true, sid: json.sid };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "network error",
    };
  }
}
