// wa.me deep-link helpers. NEXT_PUBLIC_WHATSAPP_NUMBER is inlined at build
// time, so these work in both server and client components.

const FALLBACK_NUMBER = "+201229749608";

/** The store's WhatsApp number as bare digits (wa.me rejects "+" / spaces). */
export function waNumber(): string {
  const raw = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.trim() || FALLBACK_NUMBER;
  return raw.replace(/\D/g, "");
}

/** Chat link to the store, optionally with a prefilled message. */
export function waLink(text?: string): string {
  const base = `https://wa.me/${waNumber()}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
