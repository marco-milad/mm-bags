// Pure PII-masking helpers shared by the tracking lookup and the order
// confirmation page. No server-only imports — safe for tests and clients.

/** "01012345678" → "•••••••5678". Too-short input is returned as-is. */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return phone;
  return `${"•".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}

/** First word of a full name ("Marco Milad" → "Marco"); "" when empty. */
export function firstName(name: string | null | undefined): string {
  return name?.trim().split(/\s+/)[0] ?? "";
}
