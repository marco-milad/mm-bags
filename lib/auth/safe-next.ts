/**
 * Validates a post-login `?next=` target as a same-site path.
 *
 * `startsWith("/")` alone is an open redirect: "//evil.com" and "/\evil.com"
 * both start with "/" but browsers resolve them to another host. Only a
 * single leading slash followed by a non-slash/backslash is accepted, and
 * control characters (which some parsers strip) are rejected outright.
 * Pure — see __tests__/safe-next.test.ts.
 */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw || !raw.startsWith("/")) return null;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return null;
  if (/[\u0000-\u001f\u007f]/.test(raw)) return null;
  return raw;
}
