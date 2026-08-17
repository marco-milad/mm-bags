"use client";

import { useRef, useState } from "react";
import { Check, Copy, MessageCircle, Smartphone } from "lucide-react";
import type { Locale } from "@/lib/i18n-config";
import { formatPriceEGP } from "@/lib/utils";
import {
  businessHoursDurationAr,
  businessHoursDurationEn,
  BUSINESS_HOURS_LABEL_AR,
  BUSINESS_HOURS_LABEL_EN,
} from "@/lib/orders/instapay-copy";

/**
 * Payment-instructions panel shown on the order-confirmation page
 * when the customer picked InstaPay at checkout.
 *
 * The panel deliberately does two things:
 *   1. Shows the order number, amount due, and InstaPay handle — each
 *      with a one-tap "copy" affordance. Copies are RAW values (plain
 *      order number, plain integer amount, plain handle) so they paste
 *      cleanly into bank apps; the on-screen display stays formatted.
 *   2. Provides a WhatsApp deep-link with a pre-filled message that
 *      references the exact order number + total, so the customer
 *      just attaches the transfer screenshot and hits send.
 *
 * `instapayHandle` is nullable: when the handle env var is missing we
 * still render the panel (order number, amount, WhatsApp CTA all keep
 * working) but never show a fake destination — the customer is told
 * to get the transfer details over WhatsApp instead.
 *
 * The panel does NOT — and cannot — mark the order paid. That state
 * transition happens only from the admin order-detail page after a
 * human verifies the transfer arrived. This component is purely
 * informational to the customer.
 */

type CopyTarget = "order" | "amount" | "handle";

export function InstapayInstructions({
  locale,
  orderNumber,
  totalDue,
  whatsappNumber,
  instapayHandle,
  shareLink,
  qrDataUrl,
  expirationBusinessHours,
}: {
  locale: Locale;
  orderNumber: string;
  totalDue: number;
  whatsappNumber: string;
  instapayHandle: string | null;
  /** App-generated ipn.eg share link (recipient prefilled). Null when
      not configured — the deep-link button + QR are simply omitted and
      the manual copy-the-handle flow below stays fully usable. */
  shareLink: string | null;
  /** Server-generated QR data URL encoding exactly `shareLink`. */
  qrDataUrl: string | null;
  /** Configured payment window in BUSINESS hours — passed from the
      server (the env var is server-only) so the promised window can
      never desync from what the expiry sweep actually enforces. */
  expirationBusinessHours: number;
}) {
  const isRTL = locale === "ar";
  const [copied, setCopied] = useState<CopyTarget | null>(null);
  const copyTimer = useRef<number | null>(null);

  const handleCopy = async (target: CopyTarget, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      // Cancel any pending reset first — re-copying the same target
      // within 2s would otherwise let the stale timer clear the fresh
      // "Copied" state early.
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
      setCopied(target);
      copyTimer.current = window.setTimeout(() => {
        setCopied(null);
        copyTimer.current = null;
      }, 2000);
    } catch {
      // Clipboard API rejected (permissions / insecure origin) — user
      // can still read + type the value manually. Silent fail is fine.
    }
  };

  const waMessage = isRTL
    ? `أهلاً، حبيت أأكّد دفع طلبي رقم ${orderNumber}\nالمبلغ: ${formatPriceEGP(totalDue, locale)}\nهبعت صورة الإيصال هنا.`
    : `Hi, confirming my InstaPay payment for order ${orderNumber}\nAmount: ${formatPriceEGP(totalDue, locale)}\nI'll attach the receipt here.`;
  const waHref = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(waMessage)}`;

  const steps = isRTL
    ? [
        `افتح تطبيق البنك أو محفظتك، اختار InstaPay وحوّل ${formatPriceEGP(totalDue, locale)}.`,
        `اكتب رقم الطلب ${orderNumber} في خانة الملاحظات أثناء التحويل — ده اللي بيربط تحويلك بطلبك.`,
        "احفظ صورة إيصال التحويل.",
        "ابعتها على WhatsApp — بنراجع التحويلات خلال ساعات العمل، وأول ما نتأكد نبدأ التجهيز.",
      ]
    : [
        `Open your bank app or wallet, choose InstaPay, and transfer ${formatPriceEGP(totalDue, locale)}.`,
        `Write your order number ${orderNumber} in the transfer notes/reference — it links your payment to your order.`,
        "Save a screenshot of the transfer receipt.",
        "Send it to us on WhatsApp — transfers are reviewed during business hours, and prep starts as soon as we verify.",
      ];

  return (
    <div className="rounded-2xl border-2 border-dashed border-[var(--color-accent)]/60 bg-[var(--color-accent)]/5 p-5 md:p-6">
      <div className="mb-4 flex items-center gap-3">
        <span
          aria-hidden
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-primary)]"
        >
          <Smartphone className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-display text-lg text-[var(--color-text)]">
            {isRTL ? "خطوات إتمام الدفع" : "Complete your payment"}
          </h2>
          <p className="text-xs text-[var(--color-text-secondary)]">
            {isRTL
              ? "طلبك اتحجز. باقي تحويل المبلغ وتأكيد الإيصال."
              : "Your order is reserved. Complete the transfer and share the receipt."}
          </p>
        </div>
      </div>

      {/* Native handoff — only when the app-generated share link is
          configured. Mobile gets a REAL anchor (Universal/App Links on
          ipn.eg need a genuine user tap — JS redirects don't open the
          app on iOS); desktop gets a QR of the same link to scan with
          a phone. Opening the app is NOT payment — the amount is still
          typed manually and verification stays manual, so the full
          copy-the-handle fallback below always remains. */}
      {shareLink && (
        // When QR generation failed there is nothing to show on
        // desktop — hide the whole block there instead of rendering
        // an empty padded box (the anchor inside is mobile-only).
        <div
          className={`mb-4 rounded-xl bg-[var(--color-bg)] p-4 ${qrDataUrl ? "" : "md:hidden"}`}
        >
          <a
            href={shareLink}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm font-bold text-[var(--color-primary)] transition hover:brightness-95 md:hidden"
          >
            <Smartphone className="h-4 w-4" />
            {isRTL ? "افتح تطبيق InstaPay" : "Open the InstaPay app"}
          </a>
          <p className="mt-2 text-center text-[11px] text-[var(--color-text-secondary)] md:hidden">
            {isRTL
              ? "بيفتح التطبيق والمستلم جاهز — هتكتب المبلغ بنفسك وتكمّل التحويل."
              : "Opens the app with the recipient prefilled — you type the amount and complete the transfer yourself."}
          </p>
          {qrDataUrl && (
            <div className="hidden flex-col items-center gap-2 md:flex">
              {/* eslint-disable-next-line @next/next/no-img-element -- data URL, no optimization needed */}
              <img
                src={qrDataUrl}
                alt={isRTL ? "QR لفتح InstaPay" : "QR to open InstaPay"}
                className="h-40 w-40 rounded-lg border border-[var(--color-border)] bg-white p-2"
              />
              <p className="text-center text-xs text-[var(--color-text-secondary)]">
                {isRTL
                  ? "امسح الكود ده بكاميرا موبايلك لفتح InstaPay — المستلم هيكون جاهز، وهتكتب المبلغ بنفسك."
                  : "Scan this QR with your phone to open InstaPay — recipient prefilled, you enter the amount yourself."}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Order number + amount + InstaPay handle — each row copyable */}
      <dl className="mb-4 space-y-3 rounded-xl bg-[var(--color-bg)] p-4">
        <div>
          <dt className="mb-1 text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
            {isRTL ? "رقم الطلب" : "Order number"}
          </dt>
          <dd className="flex flex-wrap items-center justify-between gap-2">
            <span
              className="font-mono text-base font-semibold text-[var(--color-text)]"
              dir="ltr"
            >
              {orderNumber}
            </span>
            <CopyChip
              isRTL={isRTL}
              copied={copied === "order"}
              onCopy={() => handleCopy("order", orderNumber)}
            />
          </dd>
        </div>
        <div className="border-t border-[var(--color-border)] pt-3">
          <dt className="mb-1 text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
            {isRTL ? "المبلغ المطلوب" : "Amount due"}
          </dt>
          <dd className="flex flex-wrap items-center justify-between gap-2">
            <span
              className="font-mono text-xl font-semibold text-[var(--color-primary)]"
              dir="ltr"
            >
              {formatPriceEGP(totalDue, locale)}
            </span>
            {/* Copy the raw integer (e.g. "1250") — bank apps reject
                formatted currency strings with symbols/digit grouping. */}
            <CopyChip
              isRTL={isRTL}
              copied={copied === "amount"}
              onCopy={() => handleCopy("amount", String(Math.round(totalDue)))}
            />
          </dd>
        </div>
        <div className="border-t border-[var(--color-border)] pt-3">
          <dt className="mb-1 text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
            {isRTL ? "حوّل على رقم InstaPay ده" : "Transfer to this InstaPay handle"}
          </dt>
          {instapayHandle ? (
            <dd className="flex flex-wrap items-center justify-between gap-2">
              <span
                className="font-mono text-base font-semibold text-[var(--color-text)] break-all"
                dir="ltr"
              >
                {instapayHandle}
              </span>
              <CopyChip
                isRTL={isRTL}
                copied={copied === "handle"}
                onCopy={() => handleCopy("handle", instapayHandle)}
              />
            </dd>
          ) : (
            <dd className="text-sm text-[var(--color-text)]">
              {isRTL
                ? "كلمنا على واتساب وهنبعتلك رقم التحويل فوراً."
                : "Message us on WhatsApp and we'll send you the transfer details right away."}
            </dd>
          )}
        </div>
      </dl>

      {/* Steps */}
      <ol className="mb-5 space-y-2 text-sm text-[var(--color-text)]">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)] text-[10px] font-bold text-[var(--color-primary)]">
              {i + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>

      {/* WhatsApp CTA */}
      <a
        href={waHref}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-light)]"
      >
        <MessageCircle className="h-4 w-4" />
        {isRTL
          ? "ابعت صورة الإيصال على واتساب"
          : "Send receipt on WhatsApp"}
      </a>

      <p className="mt-3 text-center text-[11px] text-[var(--color-text-secondary)]">
        {isRTL
          ? "الطلب هيفضل بانتظار الدفع لحد ما نستلم الإيصال ونأكّد يدوياً — سيتم مراجعة الدفع خلال ساعات العمل."
          : "Order stays pending until we receive the receipt and confirm the transfer manually — payments are reviewed during business hours."}
      </p>
      {/* Business-hours TTL — deliberately NOT phrased as wall-clock
          hours: only time inside 11:00–22:00 Africa/Cairo counts, and
          the order can never expire overnight. */}
      <p className="mt-1 text-center text-[11px] text-[var(--color-text-secondary)]">
        {isRTL
          ? `لإتمام الطلب، يرجى إتمام التحويل خلال ${businessHoursDurationAr(expirationBusinessHours)} · ساعات العمل: ${BUSINESS_HOURS_LABEL_AR}.`
          : `Please complete the transfer within ${businessHoursDurationEn(expirationBusinessHours)} · Business hours: ${BUSINESS_HOURS_LABEL_EN}.`}
      </p>
    </div>
  );
}

function CopyChip({
  isRTL,
  copied,
  onCopy,
}: {
  isRTL: boolean;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onCopy}
      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text)] transition hover:border-[var(--color-accent)]"
    >
      {copied ? (
        <>
          <Check className="h-3 w-3 text-[var(--color-success)]" />
          {isRTL ? "تم النسخ" : "Copied"}
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          {isRTL ? "نسخ" : "Copy"}
        </>
      )}
    </button>
  );
}
