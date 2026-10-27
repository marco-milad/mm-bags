/**
 * The message a shopper sends themselves (WhatsApp share sheet) so they can
 * reopen the order from any device — the stand-in for a confirmation
 * SMS/email until those exist. Pure; see __tests__/share.test.ts.
 *
 * With a view token the message carries the private order link (0031),
 * which opens the full order page with no sign-in. Without one it falls back
 * to the /track link, which deliberately carries no phone digits: the last 4
 * digits are the /track credential.
 */
export function orderShareText({
  orderNumber,
  siteUrl,
  isAr,
  viewToken,
}: {
  orderNumber: string;
  siteUrl: string;
  isAr: boolean;
  viewToken?: string | null;
}): string {
  const base = siteUrl.replace(/\/+$/, "");
  const locale = isAr ? "ar" : "en";
  if (viewToken) {
    const link = `${base}${orderLinkPath(locale, viewToken)}`;
    return isAr
      ? `طلبي من M.M Bags رقم ${orderNumber}\nتفاصيل الطلب وحالته: ${link}`
      : `My M.M Bags order ${orderNumber}\nOrder details and status: ${link}`;
  }
  const track = `${base}/${locale}/track/${encodeURIComponent(orderNumber)}`;
  return isAr
    ? `طلبي من M.M Bags رقم ${orderNumber}\nتابعه من هنا: ${track}`
    : `My M.M Bags order ${orderNumber}\nTrack it here: ${track}`;
}

/** wa.me with no number opens WhatsApp's "send to…" picker. */
export function whatsappShareHref(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

const VIEW_TOKEN_RE = /^[0-9a-f]{32}$/;

/** Shape check only (32 lowercase hex, as 0031 generates). */
export function isViewToken(value: string): boolean {
  return VIEW_TOKEN_RE.test(value);
}

/** Path of the private order page. */
export function orderLinkPath(locale: string, viewToken: string): string {
  return `/${locale}/o/${viewToken}`;
}

/**
 * wa.me chat with a customer's Egyptian mobile (01x… / 201x… / +201x…).
 * Null when the number isn't one we can address.
 */
export function customerWhatsappHref(phone: string, text: string): string | null {
  const digits = phone.replace(/\D/g, "");
  let intl: string | null = null;
  if (/^01[0125]\d{8}$/.test(digits)) intl = `20${digits.slice(1)}`;
  else if (/^201[0125]\d{8}$/.test(digits)) intl = digits;
  else if (/^00201[0125]\d{8}$/.test(digits)) intl = digits.slice(2);
  return intl ? `https://wa.me/${intl}?text=${encodeURIComponent(text)}` : null;
}
