"use client";

import { useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";
import { customerWhatsappHref } from "@/lib/orders/share";

/**
 * The customer's private order link (0031) on the admin order page: copy it,
 * or open a WhatsApp chat with the customer with the link prefilled — handy
 * when confirming the order.
 */
export function CustomerOrderLink({
  link,
  orderNumber,
  customerName,
  customerPhone,
  isAr,
}: {
  link: string;
  orderNumber: string;
  customerName: string | null;
  customerPhone: string | null;
  isAr: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const first = customerName?.trim().split(/\s+/)[0] ?? "";
  // The customer reads this in Arabic regardless of the admin's language.
  const message = `أهلاً${first ? ` ${first}` : ""}، طلبك من M.M Bags رقم ${orderNumber} وصلنا ✅\nتقدر تتابع تفاصيله وحالته من هنا: ${link}`;
  const waHref = customerPhone ? customerWhatsappHref(customerPhone, message) : null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the link is selectable below.
    }
  };

  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5 print:hidden">
      <p className="mb-1 text-[10px] uppercase tracking-wider text-[var(--color-text-secondary)]">
        {isAr ? "لينك متابعة العميل" : "Customer order link"}
      </p>
      <p className="mb-3 text-xs text-[var(--color-text-secondary)]">
        {isAr
          ? "أي حد معاه اللينك ده يشوف الطلب كامل من غير تسجيل دخول — ابعته للعميل بس."
          : "Anyone with this link sees the full order without signing in — send it to the customer only."}
      </p>
      <p
        className="mb-3 select-all break-all rounded-md bg-[var(--color-surface)] px-3 py-2 font-mono text-[11px] text-[var(--color-text)]"
        dir="ltr"
      >
        {link}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copy}
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--color-border)] px-4 text-xs font-semibold text-[var(--color-text)] transition hover:border-[var(--color-accent)]"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          <span aria-live="polite">
            {copied ? (isAr ? "اتنسخ" : "Copied") : isAr ? "انسخ اللينك" : "Copy link"}
          </span>
        </button>
        {waHref && (
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#25D366] px-4 text-xs font-semibold text-white transition hover:opacity-90"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            {isAr ? "ابعته للعميل على واتساب" : "Send to customer on WhatsApp"}
          </a>
        )}
      </div>
    </section>
  );
}
