import "server-only";

import { checkTurnstile } from "./turnstile-core";

/**
 * True when the request may proceed: the Turnstile token checks out, or
 * Turnstile is off / unreachable (see turnstile-core for the policy).
 */
export async function verifyHuman(token: unknown, ip: string, where: string): Promise<boolean> {
  const d = await checkTurnstile({ token, secret: process.env.TURNSTILE_SECRET_KEY, ip });
  if (d.ok && d.reason === "unreachable") {
    console.warn(`[turnstile] ${where}: check skipped (Cloudflare unreachable or secret invalid)`);
  }
  if (!d.ok) console.info(`[turnstile] ${where}: blocked (${d.reason}${d.codes ? ` ${d.codes.join(",")}` : ""})`);
  return d.ok;
}
