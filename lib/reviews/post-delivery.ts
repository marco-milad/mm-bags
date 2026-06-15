import "server-only";

import type { Locale } from "@/lib/i18n-config";

/**
 * Builds the "thanks for receiving your order — leave a review" message
 * shipped to customers via WhatsApp once their order status flips to
 * `delivered`. Keep the copy here so we can tweak tone without
 * digging through the route handler.
 *
 * The review link points at the PDP's #reviews anchor (the ReviewForm
 * renders inside ReviewsSection there), so a single tap lands the
 * customer right where they need to type.
 */
export function buildPostDeliveryMessage(opts: {
  locale: Locale;
  name: string;
  productSlug: string;
}): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "https://mmbags.com").replace(
    /\/+$/,
    "",
  );
  const reviewUrl = `${base}/${opts.locale}/products/${opts.productSlug}#reviews`;

  if (opts.locale === "ar") {
    return (
      `مرحباً ${opts.name}! 🎉\n` +
      `طلبك وصل بأمان — نورت!\n` +
      `هتعملنا معروف كبير لو شاركتنا رأيك في المنتج:\n` +
      `${reviewUrl}\n` +
      `رأيك بيساعدنا نتحسن ويساعد عملاء تانيين. شكراً ❤️\n` +
      `M.M Bags`
    );
  }
  return (
    `Hi ${opts.name}! 🎉\n` +
    `Your order has arrived — enjoy!\n` +
    `It would mean a lot if you shared your thoughts on the product:\n` +
    `${reviewUrl}\n` +
    `Your review helps us improve and helps other customers. Thanks ❤️\n` +
    `M.M Bags`
  );
}
