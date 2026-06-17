"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { createPurchaseOrder } from "@/lib/admin/supplier-actions";
import type { VariantOption } from "@/lib/queries/suppliers-admin";
import type { Supplier } from "@/lib/supabase/types";
import type { AdminLocale } from "@/lib/admin/locale";
import { formatPriceEGP } from "@/lib/utils";

type Line = {
  variantId: string;
  productId: string;
  productName: string;
  variantLabel: string;
  qty: number;
  unitCost: number;
};

/**
 * Create-a-PO form. Sits inside /admin/purchase-orders/new.
 *
 * Flow:
 *   1. Pick a supplier.
 *   2. Search the variant list, click to add. Each row carries
 *      product name + colour/size and is editable for qty + unit cost.
 *   3. Optional amount paid up-front + notes.
 *   4. Submit → createPurchaseOrder server action → redirect to the
 *      detail page where Mark Received and Record Payment live.
 *
 * The variant list is loaded server-side and handed in as a prop — we
 * stay client-side from there so the cashier-style search feels
 * instant.
 */
export function NewPOForm({
  suppliers,
  variants,
  prefillVariantId,
  locale,
}: {
  suppliers: Supplier[];
  variants: VariantOption[];
  prefillVariantId?: string;
  locale: AdminLocale;
}) {
  const isAr = locale === "ar";

  const [supplierId, setSupplierId] = useState(
    suppliers.find((s) => s.is_active)?.id ?? "",
  );
  const [query, setQuery] = useState("");
  const [lines, setLines] = useState<Line[]>(() => {
    if (!prefillVariantId) return [];
    const v = variants.find((x) => x.variantId === prefillVariantId);
    return v
      ? [
          {
            variantId: v.variantId,
            productId: v.productId,
            productName: v.productName,
            variantLabel: v.variantLabel,
            qty: 1,
            unitCost: 0,
          },
        ]
      : [];
  });
  const [amountPaid, setAmountPaid] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return variants.slice(0, 20);
    return variants
      .filter(
        (v) =>
          v.productName.toLowerCase().includes(q) ||
          v.variantLabel.toLowerCase().includes(q),
      )
      .slice(0, 20);
  }, [variants, query]);

  const totalCost = useMemo(
    () => lines.reduce((s, l) => s + l.qty * l.unitCost, 0),
    [lines],
  );
  const paidNum = Number(amountPaid) || 0;
  const owed = Math.max(0, totalCost - paidNum);

  function addVariant(v: VariantOption) {
    setLines((prev) => {
      if (prev.some((l) => l.variantId === v.variantId)) return prev;
      return [
        ...prev,
        {
          variantId: v.variantId,
          productId: v.productId,
          productName: v.productName,
          variantLabel: v.variantLabel,
          qty: 1,
          unitCost: 0,
        },
      ];
    });
    setQuery("");
  }

  function updateLine(variantId: string, patch: Partial<Line>) {
    setLines((prev) =>
      prev.map((l) => (l.variantId === variantId ? { ...l, ...patch } : l)),
    );
  }
  function removeLine(variantId: string) {
    setLines((prev) => prev.filter((l) => l.variantId !== variantId));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supplierId || lines.length === 0 || pending) return;
    setError(null);
    startTransition(async () => {
      const res = await createPurchaseOrder({
        supplierId,
        items: lines.map((l) => ({
          variantId: l.variantId,
          productId: l.productId,
          qty: l.qty,
          unitCost: l.unitCost,
        })),
        amountPaid: paidNum,
        notes: notes || undefined,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      // Server action returns the id; we navigate via plain redirect on
      // server side instead. (createPurchaseOrder client-call is
      // sufficient for now; a follow-up could use createPurchaseOrderForm
      // which redirects from the server.)
      window.location.href = `/admin/purchase-orders/${res.id}`;
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
            {isAr ? "المورد *" : "Supplier *"}
          </span>
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            required
            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none"
          >
            <option value="">{isAr ? "اختر المورد" : "Select supplier"}</option>
            {suppliers
              .filter((s) => s.is_active)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
            {isAr ? "المبلغ المدفوع دلوقتي (ج.م)" : "Amount paid now (EGP)"}
          </span>
          <input
            inputMode="decimal"
            value={amountPaid}
            onChange={(e) => setAmountPaid(e.target.value)}
            placeholder="0"
            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-end font-mono focus:border-[var(--color-accent)] focus:outline-none"
          />
        </label>
      </div>

      <div>
        <label className="mb-1 block text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
          {isAr ? "إضافة أصناف" : "Add items"}
        </label>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            isAr ? "ابحث عن المنتجات / الفاريانتس..." : "Search products / variants..."
          }
          className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none"
        />
        {query.trim() && (
          <ul className="mt-2 max-h-56 overflow-y-auto rounded-md border border-[var(--color-border)] bg-[var(--color-bg)]">
            {filtered.map((v) => (
              <li key={v.variantId}>
                <button
                  type="button"
                  onClick={() => addVariant(v)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-start text-sm hover:bg-[var(--color-surface)]"
                >
                  <Plus className="h-3.5 w-3.5 text-[var(--color-text-secondary)]" />
                  <span className="flex-1">{v.productName}</span>
                  <span className="text-[11px] text-[var(--color-text-secondary)]">
                    {v.variantLabel}
                  </span>
                  <span className="font-mono text-[11px] text-[var(--color-text-secondary)]">
                    {isAr ? `المخزون: ${v.stockQty}` : `stock: ${v.stockQty}`}
                  </span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-3 text-center text-xs text-[var(--color-text-secondary)]">
                {isAr ? "مفيش نتائج." : "No matches."}
              </li>
            )}
          </ul>
        )}
      </div>

      {/* Lines */}
      <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-surface)] text-[var(--color-text-secondary)]">
            <tr>
              <Th>{isAr ? "المنتج" : "Product"}</Th>
              <Th>{isAr ? "الفاريانت" : "Variant"}</Th>
              <Th className="text-end">{isAr ? "الكمية" : "Qty"}</Th>
              <Th className="text-end">{isAr ? "سعر الوحدة" : "Unit cost"}</Th>
              <Th className="text-end">{isAr ? "إجمالي السطر" : "Line total"}</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.variantId} className="border-t border-[var(--color-border)]">
                <td className="px-3 py-2">{l.productName}</td>
                <td className="px-3 py-2 text-[12px] text-[var(--color-text-secondary)]">
                  {l.variantLabel}
                </td>
                <td className="px-3 py-2 text-end">
                  <input
                    type="number"
                    min={1}
                    value={l.qty}
                    onChange={(e) =>
                      updateLine(l.variantId, {
                        qty: Math.max(1, Number(e.target.value) || 1),
                      })
                    }
                    aria-label={isAr ? "الكمية" : "Qty"}
                    className="w-20 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-end font-mono text-sm focus:border-[var(--color-accent)] focus:outline-none"
                  />
                </td>
                <td className="px-3 py-2 text-end">
                  <input
                    inputMode="decimal"
                    value={l.unitCost}
                    onChange={(e) =>
                      updateLine(l.variantId, {
                        unitCost: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    aria-label={isAr ? "سعر الوحدة" : "Unit cost"}
                    className="w-24 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-end font-mono text-sm focus:border-[var(--color-accent)] focus:outline-none"
                  />
                </td>
                <td className="px-3 py-2 text-end font-mono text-sm">
                  {formatPriceEGP(l.qty * l.unitCost)}
                </td>
                <td className="px-3 py-2 text-end">
                  <button
                    type="button"
                    onClick={() => removeLine(l.variantId)}
                    aria-label={isAr ? "حذف" : "Remove"}
                    className="grid h-7 w-7 place-items-center rounded-md border border-[var(--color-border)] text-[var(--color-text-secondary)] transition hover:border-[var(--color-error)] hover:text-[var(--color-error)]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            {lines.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-xs text-[var(--color-text-secondary)]">
                  {isAr
                    ? "أضِف صنف واحد على الأقل علشان تعمل الأمر."
                    : "Add at least one item to create the order."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
          {isAr ? "ملاحظات" : "Notes"}
        </span>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full resize-none rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none"
        />
      </label>

      <div className="grid gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-sm md:grid-cols-3">
        <Stat
          label={isAr ? "إجمالي التكلفة" : "Total cost"}
          value={formatPriceEGP(totalCost)}
        />
        <Stat
          label={isAr ? "المدفوع دلوقتي" : "Paid now"}
          value={formatPriceEGP(paidNum)}
          tone="success"
        />
        <Stat
          label={isAr ? "المستحق" : "Owed"}
          value={formatPriceEGP(owed)}
          tone={owed > 0 ? "error" : "muted"}
        />
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-md border border-[var(--color-error)]/40 bg-[var(--color-error)]/10 px-3 py-2 text-xs text-[var(--color-error)]"
        >
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || lines.length === 0 || !supplierId}
          className="inline-flex items-center gap-2 rounded-full bg-brass-500 px-6 py-2.5 text-sm font-semibold text-navy-900 transition hover:bg-brass-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {isAr ? "إنشاء أمر الشراء" : "Create purchase order"}
        </button>
      </div>
    </form>
  );
}

function Th({
  children,
  className,
}: {
  children?: React.ReactNode;
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

function Stat({
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
    <div>
      <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-secondary)]">
        {label}
      </p>
      <p className={`font-mono text-lg font-semibold ${color}`}>{value}</p>
    </div>
  );
}
