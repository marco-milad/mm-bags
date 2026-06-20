"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { RotateCcw, Loader2, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  RETURN_REASONS,
  REFUND_METHODS,
  type ReturnItemInput,
  type ReturnReason,
  type RefundMethod,
} from "@/lib/returns/shared";
import { returnReasonLabel, refundMethodLabel } from "@/lib/admin/labels";
import { createOrderReturn } from "@/lib/admin/return-actions";
import type { AdminLocale } from "@/lib/admin/locale";
import type { ReturnableLine } from "@/lib/queries/admin-returns";
import { formatPriceEGP } from "@/lib/utils";

/**
 * Admin-side modal for issuing a partial-or-full return against an
 * existing online order. The dialog locks the qty input at the
 * server-computed `remainingQty` per line so the over-return guard
 * in createOrderReturn is just a belt for the suspenders this UI
 * already wears.
 *
 * Refund amount auto-suggests sum(qty * unitPrice) but stays editable
 * so the admin can shave a restocking fee or top up for return-shipping.
 */
export function ReturnOrderDialog({
  orderId,
  returnable,
  locale,
}: {
  orderId: string;
  returnable: ReturnableLine[];
  locale: AdminLocale;
}) {
  const isAr = locale === "ar";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [qtyByItem, setQtyByItem] = useState<Record<string, number>>({});
  const [reason, setReason] = useState<ReturnReason>(RETURN_REASONS[0]);
  const [refundMethod, setRefundMethod] = useState<RefundMethod>(
    REFUND_METHODS[0],
  );
  const [refundOverride, setRefundOverride] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const totalReturnable = returnable.reduce(
    (sum, line) => sum + line.remainingQty,
    0,
  );
  const allExhausted = totalReturnable === 0;

  const suggestedRefund = useMemo(() => {
    return returnable.reduce((sum, line) => {
      const qty = qtyByItem[line.orderItemId] ?? 0;
      return sum + qty * line.unitPrice;
    }, 0);
  }, [qtyByItem, returnable]);

  const effectiveRefund = refundOverride ?? suggestedRefund;

  const selectedItems = useMemo<ReturnItemInput[]>(() => {
    return returnable
      .filter((line) => (qtyByItem[line.orderItemId] ?? 0) > 0)
      .filter((line) => line.variantId && line.productId)
      .map((line) => ({
        sourceItemId: line.orderItemId,
        variantId: line.variantId as string,
        productId: line.productId as string,
        qty: qtyByItem[line.orderItemId] ?? 0,
        unitPrice: line.unitPrice,
      }));
  }, [qtyByItem, returnable]);

  const canSubmit =
    !pending && selectedItems.length > 0 && effectiveRefund >= 0;

  const resetState = () => {
    setQtyByItem({});
    setReason(RETURN_REASONS[0]);
    setRefundMethod(REFUND_METHODS[0]);
    setRefundOverride(null);
    setNotes("");
    setError(null);
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    setError(null);
    startTransition(async () => {
      const result = await createOrderReturn({
        orderId,
        items: selectedItems,
        reason,
        refundMethod,
        refundAmount: effectiveRefund,
        notes: notes.trim() ? notes.trim() : null,
      });
      if (result.ok) {
        setOpen(false);
        resetState();
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetState();
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          disabled={allExhausted}
          title={
            allExhausted
              ? isAr
                ? "كل الأصناف اترجعت بالفعل"
                : "Every line already fully returned"
              : undefined
          }
          className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent-dark)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {isAr ? "ابدأ إرجاع" : "Start return"}
        </button>
      </DialogTrigger>
      <DialogContent
        closeAriaLabel={isAr ? "إغلاق" : "Close"}
        className="max-w-2xl"
      >
        <DialogTitle className="border-b border-[var(--color-border)] px-5 py-4 font-display text-lg text-[var(--color-text)]">
          {isAr ? "إرجاع طلب" : "Order return"}
        </DialogTitle>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-4 p-5">
            {/* Items table */}
            <div className="overflow-hidden rounded-xl border border-[var(--color-border)]">
              <table className="w-full text-sm">
                <thead className="bg-[var(--color-surface)] text-[var(--color-text-secondary)]">
                  <tr>
                    <th className="px-3 py-2 text-start text-[11px] font-semibold uppercase tracking-wider">
                      {isAr ? "المنتج" : "Item"}
                    </th>
                    <th className="px-3 py-2 text-end text-[11px] font-semibold uppercase tracking-wider">
                      {isAr ? "متاح" : "Returnable"}
                    </th>
                    <th className="px-3 py-2 text-end text-[11px] font-semibold uppercase tracking-wider">
                      {isAr ? "كمية الإرجاع" : "Qty to return"}
                    </th>
                    <th className="px-3 py-2 text-end text-[11px] font-semibold uppercase tracking-wider">
                      {isAr ? "الإجمالي" : "Line total"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {returnable.map((line) => {
                    const qty = qtyByItem[line.orderItemId] ?? 0;
                    const lineTotal = qty * line.unitPrice;
                    const disabledRow = line.remainingQty === 0;
                    return (
                      <tr
                        key={line.orderItemId}
                        className="border-t border-[var(--color-border)]"
                      >
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-3">
                            <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-[var(--color-surface)]">
                              {line.snapshotImage ? (
                                <Image
                                  src={line.snapshotImage}
                                  alt=""
                                  fill
                                  sizes="40px"
                                  className="object-cover"
                                />
                              ) : null}
                            </span>
                            <span className="min-w-0">
                              <span className="block text-[13px] text-[var(--color-text)]">
                                {line.productName}
                              </span>
                              {line.variantLabel ? (
                                <span className="font-mono text-[11px] text-[var(--color-text-secondary)]">
                                  {line.variantLabel}
                                </span>
                              ) : null}
                              <span className="block font-mono text-[10px] text-[var(--color-text-secondary)]">
                                {formatPriceEGP(line.unitPrice)} ·{" "}
                                {isAr ? "اتباع" : "Sold"}{" "}
                                {line.originalQty}
                              </span>
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-end">
                          <span
                            className={
                              disabledRow
                                ? "inline-flex items-center rounded-full bg-[var(--color-surface)] px-2 py-0.5 font-mono text-[10px] uppercase text-[var(--color-text-secondary)]"
                                : "inline-flex items-center rounded-full bg-[var(--color-accent)]/15 px-2 py-0.5 font-mono text-[10px] uppercase text-[var(--color-accent-dark)]"
                            }
                          >
                            {isAr
                              ? `متاح ${line.remainingQty}`
                              : `Returnable: ${line.remainingQty}`}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-end">
                          <input
                            type="number"
                            min={0}
                            max={line.remainingQty}
                            step={1}
                            value={qty}
                            disabled={disabledRow}
                            onChange={(e) => {
                              const raw = Number(e.target.value);
                              const clamped = Number.isFinite(raw)
                                ? Math.max(
                                    0,
                                    Math.min(line.remainingQty, Math.floor(raw)),
                                  )
                                : 0;
                              setQtyByItem((prev) => ({
                                ...prev,
                                [line.orderItemId]: clamped,
                              }));
                              setRefundOverride(null);
                            }}
                            className="w-20 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-end font-mono text-sm focus:border-[var(--color-accent)] focus:outline-none disabled:opacity-50"
                          />
                        </td>
                        <td className="px-3 py-2 text-end font-mono text-sm font-semibold">
                          {formatPriceEGP(lineTotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer fields */}
            <div className="grid gap-3 md:grid-cols-2">
              <Field label={isAr ? "السبب" : "Reason"}>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value as ReturnReason)}
                  className={selectCls}
                >
                  {RETURN_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {returnReasonLabel(r, locale)}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label={isAr ? "طريقة الاسترداد" : "Refund method"}>
                <select
                  value={refundMethod}
                  onChange={(e) =>
                    setRefundMethod(e.target.value as RefundMethod)
                  }
                  className={selectCls}
                >
                  {REFUND_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {refundMethodLabel(m, locale)}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label={
                  isAr
                    ? `مبلغ الاسترداد (مقترح ${formatPriceEGP(suggestedRefund)})`
                    : `Refund amount (suggested ${formatPriceEGP(suggestedRefund)})`
                }
              >
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={effectiveRefund}
                  onChange={(e) => {
                    const raw = Number(e.target.value);
                    setRefundOverride(Number.isFinite(raw) ? raw : 0);
                  }}
                  className={`${selectCls} font-mono`}
                />
              </Field>

              <Field label={isAr ? "ملاحظات" : "Notes"}>
                <textarea
                  rows={2}
                  maxLength={500}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={
                    isAr
                      ? "أي تفاصيل إضافية عن الإرجاع"
                      : "Any extra context about this return"
                  }
                  className={`${selectCls} resize-y`}
                />
              </Field>
            </div>

            {error ? (
              <div className="flex items-start gap-2 rounded-md border border-[var(--color-error)]/40 bg-[var(--color-error)]/10 p-3 text-sm text-[var(--color-error)]">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] px-5 py-4">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              resetState();
            }}
            className="rounded-md border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)] transition hover:text-[var(--color-text)]"
          >
            {isAr ? "إلغاء" : "Cancel"}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {isAr ? "تأكيد الإرجاع" : "Confirm return"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const selectCls =
  "w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
        {label}
      </span>
      {children}
    </label>
  );
}
