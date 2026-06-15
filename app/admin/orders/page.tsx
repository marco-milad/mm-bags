import Link from "next/link";
import { Download } from "lucide-react";
import {
  listAdminOrders,
  type ListOrderFilters,
} from "@/lib/queries/admin-orders";
import { StatusDropdown } from "@/components/admin/orders/StatusDropdown";
import type {
  OrderStatus,
  PaymentMethod,
} from "@/lib/supabase/types";
import { cn, formatPriceEGP } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_META: Record<OrderStatus, { label: string; cls: string }> = {
  pending: { label: "Pending", cls: "bg-[var(--color-warning)]/15 text-[var(--color-warning)]" },
  confirmed: { label: "Confirmed", cls: "bg-[var(--color-accent)]/15 text-[var(--color-accent-dark)]" },
  processing: { label: "Processing", cls: "bg-[var(--color-accent)]/15 text-[var(--color-accent-dark)]" },
  shipped: { label: "Shipped", cls: "bg-[var(--color-primary)]/15 text-[var(--color-primary)]" },
  out_for_delivery: { label: "Out for delivery", cls: "bg-[var(--color-primary)]/15 text-[var(--color-primary)]" },
  delivered: { label: "Delivered", cls: "bg-[var(--color-success)]/15 text-[var(--color-success)]" },
  cancelled: { label: "Cancelled", cls: "bg-[var(--color-error)]/15 text-[var(--color-error)]" },
};

export default async function OrdersPage({
  searchParams,
}: PageProps<"/admin/orders">) {
  const sp = await searchParams;
  const filters: ListOrderFilters = {
    status:
      typeof sp?.status === "string" && sp.status in STATUS_META
        ? (sp.status as OrderStatus)
        : undefined,
    paymentMethod:
      sp?.method === "card" || sp?.method === "cod"
        ? (sp.method as PaymentMethod)
        : undefined,
    from: typeof sp?.from === "string" ? sp.from : undefined,
    to: typeof sp?.to === "string" ? sp.to : undefined,
    q: typeof sp?.q === "string" ? sp.q : undefined,
  };
  const orders = await listAdminOrders(filters);

  const exportParams = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (typeof v === "string" && v) exportParams.set(k, v);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-[var(--color-text)]">
            Orders · الطلبات
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Manage online orders, status updates, and COD tracking.
            Marking an order "Delivered" fires the post-delivery WhatsApp
            review prompt.
          </p>
        </div>
        <a
          href={`/admin/orders/export?${exportParams.toString()}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-4 py-2 text-xs font-semibold text-[var(--color-text)] transition hover:border-[var(--color-accent)]"
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </a>
      </header>

      {/* Filters */}
      <form
        action="/admin/orders"
        className="flex flex-wrap items-end gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-3"
      >
        <label className="text-xs">
          <span className="mb-1 block uppercase tracking-wider text-[var(--color-text-secondary)]">
            Search
          </span>
          <input
            name="q"
            defaultValue={filters.q ?? ""}
            placeholder="Order # or phone"
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none"
          />
        </label>
        <label className="text-xs">
          <span className="mb-1 block uppercase tracking-wider text-[var(--color-text-secondary)]">
            Status
          </span>
          <select
            name="status"
            defaultValue={filters.status ?? ""}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
          >
            <option value="">All</option>
            {(Object.keys(STATUS_META) as OrderStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s].label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          <span className="mb-1 block uppercase tracking-wider text-[var(--color-text-secondary)]">
            Payment
          </span>
          <select
            name="method"
            defaultValue={filters.paymentMethod ?? ""}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
          >
            <option value="">All</option>
            <option value="cod">COD</option>
            <option value="card">Card</option>
          </select>
        </label>
        <label className="text-xs">
          <span className="mb-1 block uppercase tracking-wider text-[var(--color-text-secondary)]">
            From
          </span>
          <input
            type="date"
            name="from"
            defaultValue={filters.from ?? ""}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs">
          <span className="mb-1 block uppercase tracking-wider text-[var(--color-text-secondary)]">
            To
          </span>
          <input
            type="date"
            name="to"
            defaultValue={filters.to ?? ""}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white"
        >
          Apply
        </button>
        <Link
          href="/admin/orders"
          className="text-xs text-[var(--color-text-secondary)] underline-offset-4 hover:underline"
        >
          Reset
        </Link>
      </form>

      <p className="text-xs text-[var(--color-text-secondary)]">
        {orders.length} order{orders.length === 1 ? "" : "s"}
      </p>

      <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-[var(--color-surface)] text-[var(--color-text-secondary)]">
            <tr>
              <Th>Order #</Th>
              <Th>Customer</Th>
              <Th className="text-end">Items</Th>
              <Th className="text-end">Total</Th>
              <Th>Payment</Th>
              <Th>Status</Th>
              <Th>Update</Th>
              <Th>Date</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const status = o.status ?? "pending";
              return (
                <tr key={o.id} className="border-t border-[var(--color-border)] hover:bg-[var(--color-surface)]/50">
                  <td className="px-3 py-2 font-mono text-[11px] text-[var(--color-text)]">
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {o.order_number}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <p className="text-[var(--color-text)]">{o.customer_name}</p>
                    <p
                      className="font-mono text-[11px] text-[var(--color-text-secondary)]"
                      dir="ltr"
                    >
                      {o.customer_phone}
                    </p>
                  </td>
                  <td className="px-3 py-2 text-end font-mono text-sm">
                    {o.item_count}
                  </td>
                  <td className="px-3 py-2 text-end font-mono text-sm font-semibold text-[var(--color-primary)]">
                    {formatPriceEGP(o.total)}
                  </td>
                  <td className="px-3 py-2">
                    <PaymentBadge method={o.payment_method} />
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
                  <td className="px-3 py-2">
                    <StatusDropdown orderId={o.id} current={status} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-[11px] text-[var(--color-text-secondary)]">
                    {new Date(o.created_at).toLocaleString("en-US", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="px-3 py-2 text-end">
                    <Link
                      href={`/admin/orders/${o.id}`}
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
                <td colSpan={9} className="px-3 py-10 text-center text-xs text-[var(--color-text-secondary)]">
                  No orders match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PaymentBadge({ method }: { method: PaymentMethod }) {
  return method === "card" ? (
    <span className="rounded-full bg-[var(--color-accent)]/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--color-accent-dark)]">
      Card
    </span>
  ) : (
    <span className="rounded-full bg-brass-500/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-brass-700">
      COD
    </span>
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
