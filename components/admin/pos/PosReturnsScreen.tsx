"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Check,
  Loader2,
  Minus,
  Plus,
  RotateCcw,
  Search,
  X,
} from "lucide-react";

import type { AdminLocale } from "@/lib/admin/locale";
import {
  REFUND_METHODS,
  RETURN_REASONS,
  type RefundMethod,
  type ReturnReason,
} from "@/lib/returns/shared";
import {
  paymentMethodLabel,
  refundMethodLabel,
  returnReasonLabel,
} from "@/lib/admin/labels";
import { cn, formatPriceEGP } from "@/lib/utils";
import {
  createPosReturn,
  loadReturnableSale,
  searchPosSalesForReturn,
} from "@/lib/pos/return-actions";
import type {
  PosSaleSearchResult,
  ReturnablePosLine,
  ReturnableSaleSummary,
} from "@/lib/pos/return-shared";
import { ReturnReceipt } from "./ReturnReceipt";

/**
 * Full POS-returns client experience.
 *
 * State machine:
 *   - "search"   → cashier types a sale_number, hits "بحث"; we
 *                  show the top 10 hits as a clickable list.
 *   - "form"     → a sale is picked; we render the returnable items
 *                  table + reason / refund-method / refund-amount
 *                  controls + confirm button.
 *   - "success"  → return saved; show the printable Return Receipt
 *                  modal with a "إرجاع تاني" reset CTA.
 *
 * Refund amount defaults to sum(qty × unitPrice) of the picked
 * lines, but the cashier can override (restocking fee, partial
 * refund, etc.).
 */
export function PosReturnsScreen({ locale }: { locale: AdminLocale }) {
  const isAr = locale === "ar";

  // ─── Search step state ───────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PosSaleSearchResult[]>([]);
  const [searchPending, startSearchTransition] = useTransition();
  const [searchTouched, setSearchTouched] = useState(false);

  // ─── Form step state ─────────────────────────────────────────────
  const [sale, setSale] = useState<ReturnableSaleSummary | null>(null);
  const [lines, setLines] = useState<ReturnablePosLine[]>([]);
  const [returnedSummary, setReturnedSummary] = useState<number>(0);
  const [loadingSale, startLoadingSale] = useTransition();
  const [loadError, setLoadError] = useState<string | null>(null);

  // qty selected for return, keyed by saleItemId.
  const [pickedQty, setPickedQty] = useState<Record<string, number>>({});
  const [reason, setReason] = useState<ReturnReason>("changed_mind");
  const [refundMethod, setRefundMethod] = useState<RefundMethod>("cash");
  const [refundAmountInput, setRefundAmountInput] = useState<string>("");
  const [refundOverridden, setRefundOverridden] = useState(false);
  const [notes, setNotes] = useState("");

  // ─── Submit state ────────────────────────────────────────────────
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitPending, startSubmit] = useTransition();
  const [successPayload, setSuccessPayload] = useState<{
    returnId: string;
    refundAmount: number;
    returnedAt: string;
    items: Array<{ name: string; qty: number; unitPrice: number; lineTotal: number }>;
    reasonLabel: string;
    refundMethodLabel: string;
    notes: string | null;
    saleNumber: string;
  } | null>(null);

  // ─── Derived values ──────────────────────────────────────────────
  const suggestedRefund = useMemo(() => {
    return lines.reduce(
      (sum, l) => sum + (pickedQty[l.saleItemId] ?? 0) * l.unitPrice,
      0,
    );
  }, [lines, pickedQty]);

  const refundAmount = useMemo(() => {
    if (refundOverridden) {
      const n = Number(refundAmountInput);
      return Number.isFinite(n) && n >= 0 ? n : 0;
    }
    return suggestedRefund;
  }, [refundOverridden, refundAmountInput, suggestedRefund]);

  const pickedLinesCount = useMemo(
    () => Object.values(pickedQty).filter((q) => q > 0).length,
    [pickedQty],
  );

  // ─── Handlers ────────────────────────────────────────────────────
  function runSearch() {
    if (!searchQuery.trim()) return;
    setSearchTouched(true);
    startSearchTransition(async () => {
      const results = await searchPosSalesForReturn(searchQuery);
      setSearchResults(results);
    });
  }

  function pickSale(s: PosSaleSearchResult) {
    setLoadError(null);
    startLoadingSale(async () => {
      const res = await loadReturnableSale(s.id);
      if (!res.ok) {
        setLoadError(res.error);
        return;
      }
      setSale(res.sale);
      setLines(res.lines);
      setReturnedSummary(s.returnsTotal);
      setPickedQty({});
      setRefundAmountInput("");
      setRefundOverridden(false);
      setNotes("");
      setReason("changed_mind");
      setRefundMethod("cash");
    });
  }

  function changeQty(saleItemId: string, delta: number, cap: number) {
    setPickedQty((prev) => {
      const cur = prev[saleItemId] ?? 0;
      const next = Math.max(0, Math.min(cap, cur + delta));
      if (next === 0) {
        const { [saleItemId]: _drop, ...rest } = prev;
        return rest;
      }
      return { ...prev, [saleItemId]: next };
    });
  }

  function resetToSearch() {
    setSale(null);
    setLines([]);
    setPickedQty({});
    setSearchResults([]);
    setSearchQuery("");
    setSearchTouched(false);
    setSubmitError(null);
    setSuccessPayload(null);
    setReturnedSummary(0);
  }

  function onSubmit() {
    if (!sale) return;
    setSubmitError(null);
    const itemsForAction = lines
      .filter((l) => (pickedQty[l.saleItemId] ?? 0) > 0)
      .map((l) => ({
        sourceItemId: l.saleItemId,
        productId: l.productId ?? "",
        variantId: l.variantId ?? "",
        qty: pickedQty[l.saleItemId] ?? 0,
        unitPrice: l.unitPrice,
      }));
    if (itemsForAction.length === 0) {
      setSubmitError(
        isAr ? "اختار صنف واحد على الأقل للإرجاع." : "Pick at least one item.",
      );
      return;
    }
    if (
      itemsForAction.some(
        (i) => !i.productId || !i.variantId,
      )
    ) {
      setSubmitError(
        isAr
          ? "في صنف من غير منتج أو مقاس — مينفعش يترجّع."
          : "An item is missing product/variant info — can't return it.",
      );
      return;
    }

    startSubmit(async () => {
      const res = await createPosReturn({
        saleId: sale.id,
        items: itemsForAction,
        reason,
        refundMethod,
        refundAmount,
        notes: notes.trim() || null,
      });
      if (!res.ok) {
        setSubmitError(res.error);
        return;
      }
      const receiptItems = itemsForAction.map((i) => {
        const line = lines.find((l) => l.saleItemId === i.sourceItemId);
        const name =
          (line?.productName ?? "—") +
          (line?.variantLabel ? ` · ${line.variantLabel}` : "");
        return {
          name,
          qty: i.qty,
          unitPrice: i.unitPrice,
          lineTotal: i.qty * i.unitPrice,
        };
      });
      setSuccessPayload({
        returnId: res.returnId,
        refundAmount: res.refundAmount,
        returnedAt: new Date().toISOString(),
        items: receiptItems,
        reasonLabel: returnReasonLabel(reason, locale),
        refundMethodLabel: refundMethodLabel(refundMethod, locale),
        notes: notes.trim() || null,
        saleNumber: sale.saleNumber,
      });
    });
  }

  // ─── Render ──────────────────────────────────────────────────────

  // Step 3: success
  if (successPayload && sale) {
    return (
      <>
        <div className="rounded-2xl border border-[var(--color-success)]/40 bg-[var(--color-success)]/10 p-6 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--color-success)]/20 text-[var(--color-success)]">
            <Check className="h-6 w-6" />
          </div>
          <p className="mt-3 font-display text-xl text-[var(--color-text)]">
            {isAr ? "تم تسجيل الإرجاع" : "Return recorded"}
          </p>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {isAr
              ? `تم رد ${formatPriceEGP(successPayload.refundAmount)} من بيعة ${successPayload.saleNumber}.`
              : `Refunded ${formatPriceEGP(successPayload.refundAmount)} from ${successPayload.saleNumber}.`}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={resetToSearch}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2 text-xs font-semibold text-[var(--color-text)] transition hover:border-[var(--color-accent)]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {isAr ? "إرجاع تاني" : "Another return"}
            </button>
          </div>
        </div>
        <ReturnReceipt
          saleNumber={successPayload.saleNumber}
          returnedAt={successPayload.returnedAt}
          cashierName={null}
          reason={successPayload.reasonLabel}
          refundMethod={successPayload.refundMethodLabel}
          items={successPayload.items}
          refundAmount={successPayload.refundAmount}
          notes={successPayload.notes}
          locale={locale}
          onClose={resetToSearch}
        />
      </>
    );
  }

  // Step 2: form
  if (sale) {
    const dateLabel = new Date(sale.createdAt).toLocaleString(
      isAr ? "ar-EG" : "en-US",
      { dateStyle: "medium", timeStyle: "short" },
    );
    return (
      <div className="space-y-4">
        {/* Sale summary card */}
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--color-text-secondary)]">
                {isAr ? "البيعة" : "Sale"}
              </p>
              <p className="font-display text-lg text-[var(--color-text)]">
                {sale.saleNumber}
              </p>
              <p className="text-xs text-[var(--color-text-secondary)]">
                {dateLabel} · {paymentMethodLabel(sale.paymentMethod, locale)}
              </p>
            </div>
            <div className="text-end">
              <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-secondary)]">
                {isAr ? "إجمالي البيعة" : "Sale total"}
              </p>
              <p className="font-mono text-base font-semibold text-[var(--color-text)]">
                {formatPriceEGP(sale.total)}
              </p>
              {returnedSummary > 0 && (
                <p className="mt-0.5 text-[11px] text-[var(--color-warning)]">
                  {isAr ? "إجمالي مرتجع سابق: " : "Already returned: "}
                  {formatPriceEGP(returnedSummary)}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={resetToSearch}
            className="mt-3 text-[11px] text-[var(--color-text-secondary)] underline-offset-4 hover:text-[var(--color-text)] hover:underline"
          >
            {isAr ? "ابحث عن بيعة تانية" : "Search a different sale"}
          </button>
        </div>

        {/* Returnable items */}
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
          <header className="mb-3 flex items-baseline justify-between">
            <h2 className="font-display text-base text-[var(--color-text)]">
              {isAr ? "أصناف قابلة للإرجاع" : "Returnable items"}
            </h2>
            <span className="text-[11px] text-[var(--color-text-secondary)]">
              {isAr
                ? `${pickedLinesCount} مختار`
                : `${pickedLinesCount} picked`}
            </span>
          </header>
          {lines.length === 0 ? (
            <p className="rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-8 text-center text-xs text-[var(--color-text-secondary)]">
              {isAr ? "مفيش أصناف." : "No items."}
            </p>
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {lines.map((line) => {
                const picked = pickedQty[line.saleItemId] ?? 0;
                const fullyReturned = line.remainingQty === 0;
                return (
                  <li
                    key={line.saleItemId}
                    className={cn(
                      "flex flex-wrap items-center gap-3 py-3 text-sm",
                      fullyReturned && "opacity-50",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] text-[var(--color-text)]">
                        {line.productName}
                      </span>
                      {line.variantLabel && (
                        <span className="font-mono text-[10px] text-[var(--color-text-secondary)]">
                          {line.variantLabel}
                        </span>
                      )}
                    </span>
                    <span className="font-mono text-[11px] text-[var(--color-text-secondary)]">
                      {isAr
                        ? `اتباع ${line.originalQty} · فاضل ${line.remainingQty}`
                        : `sold ${line.originalQty} · left ${line.remainingQty}`}
                    </span>
                    <span className="font-mono text-xs text-[var(--color-text-secondary)]">
                      {formatPriceEGP(line.unitPrice)}
                    </span>
                    <QtyControl
                      value={picked}
                      max={line.remainingQty}
                      onDelta={(d) =>
                        changeQty(line.saleItemId, d, line.remainingQty)
                      }
                      isAr={isAr}
                    />
                    <span className="w-20 text-end font-mono text-xs font-semibold text-[var(--color-primary)]">
                      {formatPriceEGP(picked * line.unitPrice)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Reason + refund method + amount + notes */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label={isAr ? "السبب" : "Reason"}>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as ReturnReason)}
              className="h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm focus:border-[var(--color-accent)] focus:outline-none"
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
              className="h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm focus:border-[var(--color-accent)] focus:outline-none"
            >
              {REFUND_METHODS.map((m) => (
                <option key={m} value={m}>
                  {refundMethodLabel(m, locale)}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label={isAr ? "قيمة الاسترداد" : "Refund amount"}
            hint={
              !refundOverridden
                ? isAr
                  ? `مقترح: ${formatPriceEGP(suggestedRefund)}`
                  : `Suggested: ${formatPriceEGP(suggestedRefund)}`
                : undefined
            }
          >
            <div className="flex items-center gap-2">
              <input
                inputMode="decimal"
                value={
                  refundOverridden
                    ? refundAmountInput
                    : suggestedRefund.toFixed(2)
                }
                onFocus={() => {
                  if (!refundOverridden) {
                    setRefundAmountInput(suggestedRefund.toFixed(2));
                    setRefundOverridden(true);
                  }
                }}
                onChange={(e) => {
                  setRefundOverridden(true);
                  setRefundAmountInput(e.target.value);
                }}
                className="h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-end font-mono text-sm focus:border-[var(--color-accent)] focus:outline-none"
              />
              {refundOverridden && (
                <button
                  type="button"
                  onClick={() => {
                    setRefundOverridden(false);
                    setRefundAmountInput("");
                  }}
                  className="rounded-full p-1.5 text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
                  aria-label={
                    isAr ? "ارجع للقيمة المقترحة" : "Reset to suggested"
                  }
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </Field>

          <Field label={isAr ? "ملاحظات" : "Notes"}>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              className="w-full resize-none rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none"
            />
          </Field>
        </div>

        {submitError && (
          <p
            role="alert"
            className="rounded-md border border-[var(--color-error)]/40 bg-[var(--color-error)]/10 px-3 py-2 text-xs text-[var(--color-error)]"
          >
            {submitError}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={resetToSearch}
            className="rounded-full border border-[var(--color-border)] px-4 py-2 text-xs font-medium text-[var(--color-text)] transition hover:border-[var(--color-accent)]"
          >
            {isAr ? "إلغاء" : "Cancel"}
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitPending || pickedLinesCount === 0}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-primary)]/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isAr
              ? "تأكيد الإرجاع وطباعة إيصال"
              : "Confirm return & print receipt"}
          </button>
        </div>
      </div>
    );
  }

  // Step 1: search
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
        <label
          htmlFor="pos-return-search"
          className="block text-xs uppercase tracking-wider text-[var(--color-text-secondary)]"
        >
          {isAr ? "رقم البيعة" : "Sale number"}
        </label>
        <div className="mt-2 flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              aria-hidden
              className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-secondary)]"
            />
            <input
              id="pos-return-search"
              type="search"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  runSearch();
                }
              }}
              placeholder={
                isAr
                  ? "اكتب رقم البيعة (مثال POS-2026-ABC123)"
                  : "Type sale number (e.g. POS-2026-ABC123)"
              }
              className="h-11 w-full rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] ps-10 pe-4 text-sm shadow-sm transition focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
            />
          </div>
          <button
            type="button"
            onClick={runSearch}
            disabled={searchPending || !searchQuery.trim()}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-primary)]/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {searchPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            {isAr ? "بحث" : "Search"}
          </button>
        </div>

        {loadError && (
          <p
            role="alert"
            className="mt-3 rounded-md border border-[var(--color-error)]/40 bg-[var(--color-error)]/10 px-3 py-2 text-xs text-[var(--color-error)]"
          >
            {loadError}
          </p>
        )}
      </div>

      {/* Results */}
      {searchTouched && (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
          {searchPending ? (
            <p className="px-3 py-8 text-center text-xs text-[var(--color-text-secondary)]">
              <Loader2 className="mx-auto h-5 w-5 animate-spin" />
            </p>
          ) : searchResults.length === 0 ? (
            <p className="rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-8 text-center text-xs text-[var(--color-text-secondary)]">
              {isAr
                ? "مفيش بيعات بالرقم ده. حاول تاني."
                : "No sales match. Try again."}
            </p>
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {searchResults.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    disabled={loadingSale}
                    onClick={() => pickSale(s)}
                    className="flex w-full items-center justify-between gap-3 px-3 py-3 text-start text-sm transition hover:bg-[var(--color-bg)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-mono text-[12px] text-[var(--color-text)]">
                        {s.saleNumber}
                      </span>
                      <span className="block text-[11px] text-[var(--color-text-secondary)]">
                        {new Date(s.createdAt).toLocaleString(
                          isAr ? "ar-EG" : "en-US",
                          { dateStyle: "medium", timeStyle: "short" },
                        )}{" "}
                        · {paymentMethodLabel(s.paymentMethod, locale)}
                      </span>
                    </span>
                    <span className="text-end">
                      <span className="block font-mono text-xs font-semibold text-[var(--color-text)]">
                        {formatPriceEGP(s.total)}
                      </span>
                      {s.hasReturns && (
                        <span className="text-[10px] text-[var(--color-warning)]">
                          {isAr ? "فيها مرتجع" : "has returns"}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Small subcomponents ───────────────────────────────────────────

function QtyControl({
  value,
  max,
  onDelta,
  isAr,
}: {
  value: number;
  max: number;
  onDelta: (d: number) => void;
  isAr: boolean;
}) {
  return (
    <div className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={() => onDelta(-1)}
        disabled={value === 0}
        aria-label={isAr ? "نقص الكمية" : "Decrease"}
        className="grid h-7 w-7 place-items-center rounded-md border border-[var(--color-border)] text-[var(--color-text-secondary)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-text)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Minus className="h-3 w-3" />
      </button>
      <span className="w-8 text-center font-mono text-sm">{value}</span>
      <button
        type="button"
        onClick={() => onDelta(+1)}
        disabled={value >= max}
        aria-label={isAr ? "زود الكمية" : "Increase"}
        className="grid h-7 w-7 place-items-center rounded-md border border-[var(--color-border)] text-[var(--color-text-secondary)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-text)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
        {label}
      </label>
      <div className="mt-1">{children}</div>
      {hint && (
        <p className="mt-1 text-[10px] text-[var(--color-text-secondary)]">
          {hint}
        </p>
      )}
    </div>
  );
}
