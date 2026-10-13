// Pure PII-masking helpers shared by the tracking lookup and the order
// confirmation page. No server-only imports — safe for tests and clients.

/**
 * "01012345678" → "•••••••5678" (default keeps the last 4 digits).
 * `visible = 0` hides every digit — use it wherever the last 4 would act
 * as the /track verification code. Input with no more digits than
 * `visible` is returned as-is (nothing to hide).
 */
export function maskPhone(phone: string, visible = 4): string {
  const keep = Math.max(0, Math.floor(visible));
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= keep) return phone;
  return `${"•".repeat(digits.length - keep)}${keep > 0 ? digits.slice(-keep) : ""}`;
}

/** First word of a full name ("Marco Milad" → "Marco"); "" when empty. */
export function firstName(name: string | null | undefined): string {
  return name?.trim().split(/\s+/)[0] ?? "";
}

/**
 * Contact details for the order-confirmation "Shipping to" card. The owner
 * sees everything; anyone else (shared/leaked URL) gets the first name and
 * a fully masked phone. Showing even the last 4 digits would hand a
 * non-owner the exact credential /track asks for alongside the order
 * number, which is printed on the same page.
 */
export function shippingContactForViewer(
  address: { name?: string | null; phone?: string | null },
  viewerIsOwner: boolean,
): { name: string; phone: string } {
  if (viewerIsOwner) {
    return { name: address.name ?? "", phone: address.phone ?? "" };
  }
  return {
    name: firstName(address.name),
    phone: address.phone ? maskPhone(address.phone, 0) : "",
  };
}
