import Link from "next/link";
import { Plus } from "lucide-react";
import {
  listPurchaseOrders,
  listSuppliers,
} from "@/lib/queries/suppliers-admin";
import type { PurchaseOrderStatus } from "@/lib/supabase/types";
import { cn, formatPriceEGP } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_META: Record<PurchaseOrderStatus, { label: string; cls: string }> = {
  pending: { label: "Pending", cls: "bg-[var(--color-warning)]/15 text-[var(--color-warning)]" },
  received: { label: "Received", cls: "bg-[var(--color-accent)]/15 text-[var(--color-accent-dark)]" },
  partial: { label: "Partial paid", cls: "bg-[var(--color-primary)]/15 text-[var(--color-primary)]" },
  paid: { label: "Paid", cls: "bg-[var(--color-success)]/15 text-[var(--color-success)]" },
};

export default async function PurchaseOrdersPage({
  searchParams,
}: PageProps<"/admin/purchase-orders">) {
  const sp = await searchParams;
  const status =
    sp?.status === "pending" ||
    sp?.status === "received" ||
    sp?.status === "partial" ||
    sp?.status === "paid"
      ? (sp.status as PurchaseOrderStatus)
      : undefined;
  const supplierId =
    typeof sp?.supplier === "string" ? sp.supplier : undefined;

  const [orders, suppliers] = await Promise.all([
    listPurchaseOrders({ status, supplierId }),
    listSuppliers(),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-[var(--color-text)]">
            Purchase orders · أوامر الشراء
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Restock orders to suppliers. Marking received bumps stock and
            writes a purchase_in movement per item.
          </p>
        </div>
        <Link
          href="/admin/purchase-orders/new"
          className="inline-flex items-center gap-1.5 rounded-full bg-brass-500 px-4 py-2 text-sm font-semibold text-navy-900 transition hover:bg-brass-600"
        >
          <Plus className="h-4 w-4" />
          New PO
        </Link>
      </header>

      {/* Filter form */}
      <form
        action="/admin/purchase-orders"
        className="flex flex-wrap items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-3"
      >
        <select
          name="supplier"
          defaultValue={supplierId ?? ""}
          className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
        >
          <option value="">All suppliers</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={status ?? ""}
          className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          {(Object.keys(STATUS_META) as PurchaseOrderStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_META[s].label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white"
        >
          Apply
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-[var(--color-surface)] text-[var(--color-text-secondary)]">
            <tr>
              <Th>Date</Th>
              <Th>Supplier</Th>
              <Th className="text-end">Items</Th>
              <Th className="text-end">Total</Th>
              <Th className="text-end">Paid</Th>
              <Th className="text-end">Owed</Th>
              <Th>Status</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {orders.map((po) => {
              const status = po.status ?? "pending";
              return (
                <tr
                  key={po.id}
                  className="border-t border-[var(--color-border)] hover:bg-[var(--color-surface)]/50"
                >
                  <td className="whitespace-nowrap px-3 py-2 text-[11px] text-[var(--color-text-secondary)]">
                    {new Date(po.created_at).toLocaleDateString("en-US", {
                      dateStyle: "medium",
                    })}
                  </td>
                  <td className="px-3 py-2 text-[var(--color-text)]">
                    {po.supplier_name ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-end font-mono text-sm">
                    {po.item_count}
                  </td>
                  <td className="px-3 py-2 text-end font-mono text-sm text-[var(--color-text)]">
                    {formatPriceEGP(po.total_cost ?? 0)}
                  </td>
                  <td className="px-3 py-2 text-end font-mono text-sm text-[var(--color-success)]">
                    {formatPriceEGP(po.amount_paid ?? 0)}
                  </td>
                  <td className="px-3 py-2 text-end font-mono text-sm">
                    <span
                      className={
                        (po.amount_owed ?? 0) > 0
                          ? "text-[var(--color-error)]"
                          : "text-[var(--color-text-secondary)]"
                      }
                    >
                      {formatPriceEGP(po.amount_owed ?? 0)}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
                        STATUS_META[status].cls,
                      )}
                    >
                      {STATUS_META[status].label}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-end">
                    <Link
                      href={`/admin/purchase-orders/${po.id}`}
                      className="text-xs text-[var(--color-primary)] underline-offset-4 hover:underline"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              );
            })}
            {orders.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-xs text-[var(--color-text-secondary)]">
                  No purchase orders match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
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
