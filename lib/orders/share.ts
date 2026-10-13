/**
 * The message a shopper sends themselves (WhatsApp share sheet) so the order
 * number lives somewhere they can find from any device — the stand-in for a
 * confirmation SMS/email until those exist. Pure; see __tests__/share.test.ts.
 *
 * The track link deliberately carries no phone digits: the shopper may
 * forward this message, and the last 4 digits are the /track credential.
 */
export function orderShareText({
  orderNumber,
  siteUrl,
  isAr,
}: {
  orderNumber: string;
  siteUrl: string;
  isAr: boolean;
}): string {
  const base = siteUrl.replace(/\/+$/, "");
  const track = `${base}/${isAr ? "ar" : "en"}/track/${encodeURIComponent(orderNumber)}`;
  return isAr
    ? `طلبي من M.M Bags رقم ${orderNumber}\nتابعه من هنا: ${track}`
    : `My M.M Bags order ${orderNumber}\nTrack it here: ${track}`;
}

/** wa.me with no number opens WhatsApp's "send to…" picker. */
export function whatsappShareHref(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
