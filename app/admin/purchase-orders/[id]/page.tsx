import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { notFound } from "next/navigation";
import { getPurchaseOrderDetail } from "@/lib/queries/suppliers-admin";
import {
  markReceivedForm,
  recordPaymentForm,
} from "@/lib/admin/supplier-actions";
import { CancelPOButton } from "@/components/admin/purchase-orders/CancelPOButton";
import { POShareButtons } from "@/components/admin/purchase-orders/POShareButtons";
import { cn, formatPriceEGP } from "@/lib/utils";
import { getAdminLocale, type AdminLocale } from "@/lib/admin/locale";
import type { PurchaseOrderStatus } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const STATUS_META: Record<
  PurchaseOrderStatus,
  { label_en: string; label_ar: string; cls: string }
> = {
  pending: {
    label_en: "Pending",
    label_ar: "في الانتظار",
    cls: "bg-[var(--color-warning)]/15 text-[var(--color-warning)]",
  },
  received: {
    label_en: "Received",
    label_ar: "تم الاستلام",
    cls: "bg-[var(--color-accent)]/15 text-[var(--color-accent-dark)]",
  },
  partial: {
    label_en: "Partial paid",
    label_ar: "مدفوع جزئيًا",
    cls: "bg-[var(--color-primary)]/15 text-[var(--color-primary)]",
  },
  paid: {
    label_en: "Paid",
    label_ar: "مدفوع",
    cls: "bg-[var(--color-success)]/15 text-[var(--color-success)]",
  },
};

function statusLabel(status: PurchaseOrderStatus, locale: AdminLocale): string {
  return locale === "ar"
    ? STATUS_META[status].label_ar
    : STATUS_META[status].label_en;
}

export default async function PurchaseOrderDetailPage({
  params,
}: PageProps<"/admin/purchase-orders/[id]">) {
  const locale = await getAdminLocale();
  const isAr = locale === "ar";

  const { id } = await params;
  const po = await getPurchaseOrderDetail(id);
  if (!po) notFound();

  const status = po.status ?? "pending";
  const meta = STATUS_META[status];
  const isReceived = status === "received" || status === "paid";
  const fullyPaid = (po.amount_owed ?? 0) === 0;

  return (
    <div className="space-y-6">
      <Link
        href="/admin/purchase-orders"
        className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
      >
        <ArrowLeft className="h-3 w-3" />
        {isAr ? "الرجوع لأوامر الشراء" : "Back to purchase orders"}
      </Link>

      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-[var(--color-text)]">
            {po.supplier_name ?? (isAr ? "(بدون مورد)" : "(no supplier)")}
          </h1>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
            {isAr ? "تم الإنشاء " : "Created "}
            {new Date(po.created_at).toLocaleString(
              isAr ? "ar-EG" : "en-US",
              { dateStyle: "medium", timeStyle: "short" },
            )}
          </p>
        </div>
        <span
          className={cn(
            "rounded-full px-3 py-1 font-mono text-[11px] uppercase tracking-wider",
            meta.cls,
          )}
        >
          {statusLabel(status, locale)}
        </span>
      </header>

      {/* Branded PDF + WhatsApp-to-supplier — sits above the totals so
          the admin sees it before they even think about doing anything
          to the PO. */}
      <POShareButtons
        poId={po.id}
        poNumber={po.id.slice(0, 8).toUpperCase()}
        supplierPhone={po.supplier_phone}
        supplierName={po.supplier_name ?? (isAr ? "حضرتك" : "there")}
        totalCost={Number(po.total_cost ?? 0)}
        amountOwed={Number(po.amount_owed ?? 0)}
        isAr={isAr}
      />

      {/* Totals */}
      <section className="grid gap-3 md:grid-cols-3">
        <Card
          label={isAr ? "إجمالي التكلفة" : "Total cost"}
          value={formatPriceEGP(po.total_cost ?? 0)}
        />
        <Card
          label={isAr ? "المدفوع" : "Paid"}
          value={formatPriceEGP(po.amount_paid ?? 0)}
          tone="success"
        />
        <Card
          label={isAr ? "المستحق" : "Owed"}
          value={formatPriceEGP(po.amount_owed ?? 0)}
          tone={(po.amount_owed ?? 0) > 0 ? "error" : "muted"}
        />
      </section>

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
        {!isReceived && (
          <form action={markReceivedForm}>
            <input type="hidden" name="id" value={po.id} />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-primary)]/90"
            >
              <CheckCircle2 className="h-4 w-4" />
              {isAr
                ? "تم الاستلام (يضاف للمخزون)"
                : "Mark received (adds to stock)"}
            </button>
          </form>
        )}
        {!fullyPaid && (
          <form
            action={recordPaymentForm}
            className="flex flex-wrap items-center gap-2"
          >
            <input type="hidden" name="id" value={po.id} />
            <input
              name="amount"
              required
              inputMode="decimal"
              placeholder={isAr ? "المبلغ المدفوع (ج.م)" : "Amount paid (EGP)"}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-end font-mono text-sm focus:border-[var(--color-accent)] focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-full border border-[var(--color-success)]/40 bg-[var(--color-success)]/10 px-4 py-2 text-sm font-semibold text-[var(--color-success)] transition hover:bg-[var(--color-success)]/20"
            >
              {isAr ? "تسجيل الدفع" : "Record payment"}
            </button>
          </form>
        )}
        {status === "pending" && (
          <CancelPOButton id={po.id} isAr={isAr} />
        )}
      </div>

      {/* Items */}
      <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-surface)] text-[var(--color-text-secondary)]">
            <tr>
              <Th>{isAr ? "المنتج" : "Product"}</Th>
              <Th>{isAr ? "الفاريانت" : "Variant"}</Th>
              <Th className="text-end">{isAr ? "الكمية" : "Qty"}</Th>
              <Th className="text-end">{isAr ? "سعر الوحدة" : "Unit cost"}</Th>
              <Th className="text-end">{isAr ? "الإجمالي" : "Total"}</Th>
            </tr>
          </thead>
          <tbody>
            {po.items.map((it) => (
              <tr key={it.id} className="border-t border-[var(--color-border)]">
                <td className="px-3 py-2">
                  {it.product_name ?? (isAr ? "(محذوف)" : "(deleted)")}
                </td>
                <td className="px-3 py-2 text-[12px] text-[var(--color-text-secondary)]">
                  {it.variant_label ?? "—"}
                </td>
                <td className="px-3 py-2 text-end font-mono text-sm">{it.qty}</td>
                <td className="px-3 py-2 text-end font-mono text-sm">
                  {formatPriceEGP(it.unit_cost)}
                </td>
                <td className="px-3 py-2 text-end font-mono text-sm font-semibold">
                  {formatPriceEGP(it.total_cost)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {po.notes && (
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-4 text-sm">
          <p className="mb-1 text-[10px] uppercase tracking-wider text-[var(--color-text-secondary)]">
            {isAr ? "ملاحظات" : "Notes"}
          </p>
          <p className="text-[var(--color-text)] whitespace-pre-wrap">
            {po.notes}
          </p>
        </div>
      )}
    </div>
  );
}

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={
        "px-3 py-2 text-start text-[11px] font-semibold uppercase tracking-wider " +
        (className ?? "")
      }
    >
      {children}
    </th>
  );
}

function Card({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "error" | "muted";
}) {
  const color =
    tone === "success"
      ? "text-[var(--color-success)]"
      : tone === "error"
        ? "text-[var(--color-error)]"
        : tone === "muted"
          ? "text-[var(--color-text-secondary)]"
          : "text-[var(--color-text)]";
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
      <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-secondary)]">
        {label}
      </p>
      <p className={`font-mono text-2xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}
