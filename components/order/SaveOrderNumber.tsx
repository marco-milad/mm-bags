"use client";

import { useState } from "react";
import { Check, Copy, Send } from "lucide-react";
import type { Locale } from "@/lib/i18n-config";
import { orderShareText, whatsappShareHref } from "@/lib/orders/share";

/**
 * "Keep your order number" actions under the order number on the
 * confirmation page. Nothing is sent to the shopper automatically yet (no
 * SMS/email until the domain), so this is how they keep the number for
 * tracking from another device: copy it, or send it to themselves on
 * WhatsApp (the share picker includes "Message yourself").
 */
export function SaveOrderNumber({
  orderNumber,
  siteUrl,
  locale,
}: {
  orderNumber: string;
  siteUrl: string;
  locale: Locale;
}) {
  const isAr = locale === "ar";
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(orderNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (old browser / permissions): the number is still
      // on screen to copy by hand.
    }
  };

  const shareHref = whatsappShareHref(orderShareText({ orderNumber, siteUrl, isAr }));

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-2">
      <p className="text-xs text-[var(--color-text-secondary)]">
        {isAr
          ? "احتفظ برقم الطلب — هتحتاجه عشان تتابع طلبك من أي جهاز."
          : "Keep this number — you'll need it to track your order from any device."}
      </p>
      <div className="flex w-full flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={copy}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--color-border)] px-4 text-sm text-[var(--color-text)] transition hover:border-[var(--color-accent)]"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          <span aria-live="polite">
            {copied ? (isAr ? "اتنسخ" : "Copied") : isAr ? "انسخ رقم الطلب" : "Copy order number"}
          </span>
        </button>
        <a
          href={shareHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--color-border)] px-4 text-sm text-[var(--color-text)] transition hover:border-[var(--color-accent)]"
        >
          <Send className="h-4 w-4" />
          {isAr ? "ابعته لنفسك على واتساب" : "Send it to yourself on WhatsApp"}
        </a>
      </div>
    </div>
  );
}
