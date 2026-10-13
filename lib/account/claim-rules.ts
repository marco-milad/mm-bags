/**
 * Rules for attaching guest orders to an account (Etsy's model): an order
 * placed as a guest moves into an account only when that account's email is
 * the order's email AND the account has proven it owns the address.
 *
 * Email only, never phone: phones are not verified anywhere in this app, so
 * "same phone" would let anyone type a stranger's number and see their
 * orders. Pure — unit-tested in lib/account/__tests__/claim-rules.test.ts.
 */

export type ClaimUser = {
  email?: string | null;
  email_confirmed_at?: string | null;
};

/**
 * The address to match guest orders against, or null when this account may
 * not claim anything (no email, or the email was never confirmed).
 */
export function claimableEmail(user: ClaimUser): string | null {
  const email = user.email?.trim().toLowerCase();
  if (!email || !email.includes("@")) return null;
  // PostgREST treats "*" as a LIKE wildcard and it can't be escaped the way
  // %/_ can; such addresses are legal but vanishingly rare — don't match.
  if (email.includes("*")) return null;
  if (!user.email_confirmed_at) return null;
  return email;
}

/**
 * Escapes LIKE wildcards so an ilike() match is an exact, case-insensitive
 * comparison. Without it "a_b@x.com" would also match "axb@x.com".
 */
export function escapeIlike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}
