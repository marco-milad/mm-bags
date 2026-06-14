import "server-only";

import { Resend } from "resend";

/**
 * Single shared Resend client. We instantiate lazily so importing this
 * module doesn't blow up at build time when RESEND_API_KEY isn't set
 * (e.g. preview deploys, type-check runs).
 */
let cached: Resend | null = null;

export function getResend(): Resend {
  if (cached) return cached;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    // We throw a clear runtime error instead of letting the SDK's own
    // less-helpful message bubble up. Callers should catch + return a 500.
    throw new Error("RESEND_API_KEY is not configured");
  }
  cached = new Resend(key);
  return cached;
}

export const EMAIL_FROM_DEFAULT = "M.M Bags <marco@mmbags.com>";
export const ADMIN_EMAIL_DEFAULT = "marco@mmbags.com";

export function emailFrom(): string {
  const from = process.env.EMAIL_FROM?.trim();
  if (!from) return EMAIL_FROM_DEFAULT;
  // If env value is bare email, wrap with brand name. If it's already
  // "Name <addr>", let it through.
  return from.includes("<") ? from : `M.M Bags <${from}>`;
}

export function adminEmail(): string {
  return process.env.ADMIN_EMAIL?.trim() || ADMIN_EMAIL_DEFAULT;
}
