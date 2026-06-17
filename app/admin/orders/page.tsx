import Link from "next/link";
import { Download } from "lucide-react";
import {
  listAdminOrders,
  type ListOrderFilters,
} from "@/lib/queries/admin-orders";
import { StatusDropdown } from "@/components/admin/orders/StatusDropdown";
import { getAdminLocale } from "@/lib/admin/locale";
import {
  orderStatusLabel,
  paymentMethodLabel,
  ORDER_STATUSES,
} from "@/lib/admin/labels";
import type {
  OrderStatus,
  PaymentMethod,
} from "@/lib/supabase/types";
import { cn, formatPriceEGP } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_CLS: Record<OrderStatus, string> = {
  pending: "bg-[var(--color-warning)]/15 text-[var(--color-warning)]",
  confirmed: "bg-[var(--color-accent)]/15 text-[var(--color-accent-dark)]",
  processing: "bg-[var(--color-accent)]/15 text-[var(--color-accent-dark)]",
  shipped: "bg-[var(--color-primary)]/15 text-[var(--color-primary)]",
  out_for_delivery: "bg-[var(--color-primary)]/15 text-[var(--color-primary)]",
  delivered: "bg-[var(--color-success)]/15 text-[var(--color-success)]",
  cancelled: "bg-[var(--color-error)]/15 text-[var(--color-error)]",
};

export default async function OrdersPage({
  searchParams,
}: PageProps<"/admin/orders">) {
  const locale = await getAdminLocale();
  const isAr = locale === "ar";
  const sp = await searchParams;
  const filters: ListOrderFilters = {
    status:
      typeof sp?.status === "string" && sp.status in STATUS_CLS
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
            {isAr ? "الطلبات" : "Orders"}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {isAr
              ? "إدارة الطلبات أونلاين، تحديث الحالة، ومتابعة الدفع عند الاستلام. تأكيد التسليم بيبعث طلب التقييم على واتساب."
              : "Manage online orders, status updates, and COD tracking. Marking an order \"Delivered\" fires the post-delivery WhatsApp review prompt."}
          </p>
        </div>
        <a
          href={`/admin/orders/export?${exportParams.toString()}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-4 py-2 text-xs font-semibold text-[var(--color-text)] transition hover:border-[var(--color-accent)]"
        >
          <Download className="h-3.5 w-3.5" />
          {isAr ? "تصدير CSV" : "Export CSV"}
        </a>
      </header>

      {/* Filters */}
      <form
        action="/admin/orders"
        className="flex flex-wrap items-end gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-3"
      >
        <label className="text-xs">
          <span className="mb-1 block uppercase tracking-wider text-[var(--color-text-secondary)]">
            {isAr ? "بحث" : "Search"}
          </span>
          <input
            name="q"
            defaultValue={filters.q ?? ""}
            placeholder={isAr ? "رقم الطلب أو الموبايل" : "Order # or phone"}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none"
          />
        </label>
        <label className="text-xs">
          <span className="mb-1 block uppercase tracking-wider text-[var(--color-text-secondary)]">
            {isAr ? "الحالة" : "Status"}
          </span>
          <select
            name="status"
            defaultValue={filters.status ?? ""}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
          >
            <option value="">{isAr ? "الكل" : "All"}</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {orderStatusLabel(s, locale)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          <span className="mb-1 block uppercase tracking-wider text-[var(--color-text-secondary)]">
            {isAr ? "طريقة الدفع" : "Payment"}
          </span>
          <select
            name="method"
            defaultValue={filters.paymentMethod ?? ""}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
          >
            <option value="">{isAr ? "الكل" : "All"}</option>
            <option value="cod">{paymentMethodLabel("cod", locale)}</option>
            <option value="card">{paymentMethodLabel("card", locale)}</option>
          </select>
        </label>
        <label className="text-xs">
          <span className="mb-1 block uppercase tracking-wider text-[var(--color-text-secondary)]">
            {isAr ? "من" : "From"}
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
            {isAr ? "إلى" : "To"}
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
          {isAr ? "تطبيق" : "Apply"}
        </button>
        <Link
          href="/admin/orders"
          className="text-xs text-[var(--color-text-secondary)] underline-offset-4 hover:underline"
        >
          {isAr ? "تصفير" : "Reset"}
        </Link>
      </form>

      <p className="text-xs text-[var(--color-text-secondary)]">
        {isAr
          ? `${orders.length} طلب`
          : `${orders.length} order${orders.length === 1 ? "" : "s"}`}
      </p>

      <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-[var(--color-surface)] text-[var(--color-text-secondary)]">
            <tr>
              <Th>{isAr ? "رقم الطلب" : "Order #"}</Th>
              <Th>{isAr ? "العميل" : "Customer"}</Th>
              <Th className="text-end">{isAr ? "العناصر" : "Items"}</Th>
              <Th className="text-end">{isAr ? "الإجمالي" : "Total"}</Th>
              <Th>{isAr ? "الدفع" : "Payment"}</Th>
              <Th>{isAr ? "الحالة" : "Status"}</Th>
              <Th>{isAr ? "تحديث" : "Update"}</Th>
              <Th>{isAr ? "التاريخ" : "Date"}</Th>
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
                    <PaymentBadge method={o.payment_method} isAr={isAr} />
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
                        STATUS_CLS[status],
                      )}
                    >
                      {orderStatusLabel(status, locale)}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <StatusDropdown
                      orderId={o.id}
                      current={status}
                      locale={locale}
                    />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-[11px] text-[var(--color-text-secondary)]">
                    {new Date(o.created_at).toLocaleString(
                      isAr ? "ar-EG" : "en-US",
                      {
                        dateStyle: "short",
                        timeStyle: "short",
                      },
                    )}
                  </td>
                  <td className="px-3 py-2 text-end">
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="text-xs text-[var(--color-primary)] underline-offset-4 hover:underline"
                    >
                      {isAr ? "فتح" : "Open"}
                    </Link>
                  </td>
                </tr>
              );
            })}
            {orders.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-10 text-center text-xs text-[var(--color-text-secondary)]">
                  {isAr
                    ? "لا توجد طلبات مطابقة للفلاتر الحالية."
                    : "No orders match the current filters."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PaymentBadge({
  method,
  isAr,
}: {
  method: PaymentMethod;
  isAr: boolean;
}) {
  return method === "card" ? (
    <span className="rounded-full bg-[var(--color-accent)]/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--color-accent-dark)]">
      {isAr ? "بطاقة" : "Card"}
    </span>
  ) : (
    <span className="rounded-full bg-brass-500/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-brass-700">
      {isAr ? "عند الاستلام" : "COD"}
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
