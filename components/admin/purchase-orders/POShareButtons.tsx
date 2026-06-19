"use client";

import { Download, MessageCircle } from "lucide-react";

/**
 * "Download PDF" + "Send to supplier on WhatsApp" buttons for the PO
 * detail page. Client component because the WhatsApp link needs to
 * include the deployment's absolute origin (so when the supplier
 * taps it on their phone, the link to view the full PO actually
 * resolves). `window.location.origin` is the cheap reliable source.
 *
 * WhatsApp wa.me deep links accept a pre-encoded `?text=` payload.
 * Egyptian numbers may arrive as 01XXXXXXXXX (no country code) — we
 * normalise to +20 for wa.me, which insists on international format.
 */
export function POShareButtons({
  poId,
  poNumber,
  supplierPhone,
  supplierName,
  totalCost,
  amountOwed,
  isAr,
}: {
  poId: string;
  poNumber: string;
  supplierPhone: string | null;
  supplierName: string;
  totalCost: number;
  amountOwed: number;
  isAr: boolean;
}) {
  const pdfHref = `/admin/purchase-orders/${poId}/pdf`;

  function openWhatsApp() {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const pdfUrl = origin + pdfHref;
    const greeting = isAr
      ? `أهلًا ${supplierName}،`
      : `Hello ${supplierName},`;
    const body = isAr
      ? `أمر شراء رقم ${poNumber} من M.M Bags\nالإجمالي: ${formatEgp(totalCost)}\nالمستحق: ${formatEgp(amountOwed)}\n\nالـ PDF الكامل بكل الأصناف هنا:\n${pdfUrl}`
      : `Purchase order ${poNumber} from M.M Bags\nTotal: ${formatEgp(totalCost)}\nOwed: ${formatEgp(amountOwed)}\n\nFull PDF with all items here:\n${pdfUrl}`;
    const message = `${greeting}\n\n${body}`;
    const url = `https://wa.me/${normaliseEgyptianPhone(supplierPhone)}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={pdfHref}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2 text-xs font-semibold text-[var(--color-text)] transition hover:border-[var(--color-accent)]"
      >
        <Download className="h-3.5 w-3.5" />
        {isAr ? "تحميل PDF" : "Download PDF"}
      </a>
      <button
        type="button"
        onClick={openWhatsApp}
        disabled={!supplierPhone}
        title={
          !supplierPhone
            ? isAr
              ? "أضف رقم تليفون للمورد عشان تقدر تبعت له واتساب"
              : "Add a phone number to this supplier to send via WhatsApp"
            : undefined
        }
        className="inline-flex items-center gap-1.5 rounded-full border border-[#25D366]/40 bg-[#25D366]/10 px-4 py-2 text-xs font-semibold text-[#0d8a3b] transition hover:bg-[#25D366]/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <MessageCircle className="h-3.5 w-3.5" />
        {isAr ? "إرسال للمورد على واتساب" : "Send to supplier on WhatsApp"}
      </button>
    </div>
  );
}

/**
 * wa.me requires international format without the leading +. Egyptian
 * mobile numbers commonly arrive as 01XXXXXXXXX (11 digits, leading
 * 0). We strip the 0 and prefix 20. Anything that doesn't match the
 * Egyptian shape is sent through digits-only so wa.me at least
 * attempts the dial — wa.me silently returns its own error page on a
 * bad number, which is better UX than a hard-block on the client.
 */
function normaliseEgyptianPhone(raw: string | null): string {
  if (!raw) return "";
  const digits = raw.replace(/\D+/g, "");
  if (digits.startsWith("20")) return digits;
  if (digits.startsWith("0") && digits.length === 11) return `20${digits.slice(1)}`;
  return digits;
}

function formatEgp(n: number): string {
  return `${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ج.م`;
}
