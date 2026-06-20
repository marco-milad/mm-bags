import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { notFound } from "next/navigation";
import { getAdminOrderDetail } from "@/lib/queries/admin-orders";
import {
  getReturnableQuantitiesForOrder,
  listReturnsForOrder,
} from "@/lib/queries/admin-returns";
import { saveCodTracking } from "@/lib/admin/order-actions";
import { StatusDropdown } from "@/components/admin/orders/StatusDropdown";
import { PrintInvoiceButton } from "@/components/admin/orders/PrintButton";
import { ReturnOrderDialog } from "@/components/admin/orders/ReturnOrderDialog";
import { getAdminLocale } from "@/lib/admin/locale";
import {
  orderStatusLabel,
  paymentMethodLabel,
  paymentStatusLabel,
  refundMethodLabel,
  returnReasonLabel,
} from "@/lib/admin/labels";
import type { OrderStatus } from "@/lib/supabase/types";
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

const STATUS_FLOW: ReadonlyArray<OrderStatus> = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "out_for_delivery",
  "delivered",
];

export default async function OrderDetailPage({
  params,
}: PageProps<"/admin/orders/[id]">) {
  const locale = await getAdminLocale();
  const isAr = locale === "ar";
  const { id } = await params;
  const order = await getAdminOrderDetail(id);
  if (!order) notFound();

  const [returnable, existingReturns] = await Promise.all([
    getReturnableQuantitiesForOrder(order.id),
    listReturnsForOrder(order.id),
  ]);

  const status = order.status ?? "pending";
  const cod = order.cod_tracking;
  const customer = order.customer;
  const BackArrow = isAr ? ArrowRight : ArrowLeft;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
        >
          <BackArrow className="h-3 w-3" />
          {isAr ? "رجوع للطلبات" : "Back to orders"}
        </Link>
        <PrintInvoiceButton locale={locale} />
      </div>

      {/* The invoice container — the print stylesheet isolates this
          via #order-invoice-print so the rest of the admin chrome
          (sidebar, status form) is hidden when the admin hits print. */}
      <div id="order-invoice-print" className="space-y-6">
        <header className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--color-text-secondary)]">
              {order.order_number}
            </p>
            <h1 className="font-display text-2xl text-[var(--color-text)]">
              {customer.name ?? (isAr ? "(زائر)" : "(guest)")}
            </h1>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              {isAr ? "تم الطلب " : "Placed "}
              {new Date(order.created_at).toLocaleString(
                isAr ? "ar-EG" : "en-US",
                {
                  dateStyle: "medium",
                  timeStyle: "short",
                },
              )}
            </p>
          </div>
          <span
            className={cn(
              "rounded-full px-3 py-1 font-mono text-[11px] uppercase tracking-wider",
              STATUS_CLS[status],
            )}
          >
            {orderStatusLabel(status, locale)}
          </span>
        </header>

        {/* Customer + items two-column */}
        <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
          {/* Customer panel */}
          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5">
            <p className="mb-3 text-[10px] uppercase tracking-wider text-[var(--color-text-secondary)]">
              {isAr ? "العميل" : "Customer"}
            </p>
            <dl className="space-y-2 text-sm">
              <DL
                label={isAr ? "الاسم" : "Name"}
                value={customer.name ?? (isAr ? "(زائر)" : "(guest)")}
              />
              <DL
                label={isAr ? "الموبايل" : "Phone"}
                value={customer.phone ?? "—"}
                mono
              />
              <DL
                label={isAr ? "البريد" : "Email"}
                value={customer.email ?? order.guest_email ?? "—"}
                mono
              />
              <DL
                label={isAr ? "المحافظة" : "Governorate"}
                value={customer.governorate ?? "—"}
              />
              <DL
                label={isAr ? "المدينة" : "City"}
                value={customer.city ?? "—"}
              />
              <DL
                label={isAr ? "الشارع" : "Street"}
                value={customer.street ?? "—"}
              />
              {customer.building && (
                <DL
                  label={isAr ? "العقار" : "Building"}
                  value={customer.building}
                />
              )}
              {customer.notes && (
                <DL
                  label={isAr ? "ملاحظات" : "Notes"}
                  value={customer.notes}
                />
              )}
            </dl>
          </section>

          {/* Items */}
          <section className="space-y-3">
            <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
              <table className="w-full text-sm">
                <thead className="bg-[var(--color-surface)] text-[var(--color-text-secondary)]">
                  <tr>
                    <Th>{isAr ? "المنتج" : "Item"}</Th>
                    <Th className="text-end">{isAr ? "السعر" : "Unit"}</Th>
                    <Th className="text-end">{isAr ? "الكمية" : "Qty"}</Th>
                    <Th className="text-end">{isAr ? "الإجمالي" : "Total"}</Th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((it) => (
                    <tr key={it.id} className="border-t border-[var(--color-border)]">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-3">
                          {it.snapshot_image && (
                            <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-[var(--color-surface-2)]">
                              <Image
                                src={it.snapshot_image}
                                alt=""
                                fill
                                sizes="40px"
                                className="object-cover"
                              />
                            </span>
                          )}
                          <span className="min-w-0">
                            <span className="block text-[13px] text-[var(--color-text)]">
                              {it.product_name ?? it.snapshot_name ?? "—"}
                            </span>
                            {it.variant_label && (
                              <span className="font-mono text-[11px] text-[var(--color-text-secondary)]">
                                {it.variant_label}
                              </span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-end font-mono text-sm">
                        {formatPriceEGP(it.unit_price)}
                      </td>
                      <td className="px-3 py-2 text-end font-mono text-sm">
                        {it.qty}
                      </td>
                      <td className="px-3 py-2 text-end font-mono text-sm font-semibold">
                        {formatPriceEGP(it.qty * it.unit_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <dl className="ms-auto w-full max-w-xs space-y-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 text-sm">
              <DL
                label={isAr ? "الإجمالي قبل الشحن" : "Subtotal"}
                value={formatPriceEGP(order.subtotal)}
              />
              <DL
                label={isAr ? "الشحن" : "Shipping"}
                value={formatPriceEGP(order.shipping_fee ?? 0)}
              />
              {(order.discount_amount ?? 0) > 0 && (
                <DL
                  label={isAr ? "خصم" : "Discount"}
                  value={`- ${formatPriceEGP(order.discount_amount ?? 0)}`}
                />
              )}
              {(order.loyalty_discount ?? 0) > 0 && (
                <DL
                  label={isAr ? "نقاط الولاء" : "Loyalty"}
                  value={`- ${formatPriceEGP(order.loyalty_discount ?? 0)}`}
                />
              )}
              <div className="my-1 border-t border-dashed border-[var(--color-border)]" />
              <DL
                label={isAr ? "الإجمالي" : "Total"}
                value={formatPriceEGP(order.total)}
                strong
              />
              <DL
                label={isAr ? "طريقة الدفع" : "Payment"}
                value={paymentMethodLabel(order.payment_method, locale)}
              />
              <DL
                label={isAr ? "حالة الدفع" : "Status"}
                value={paymentStatusLabel(order.payment_status, locale)}
              />
            </dl>
          </section>
        </div>

        {/* Status timeline */}
        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5 print:hidden">
          <p className="mb-3 text-[10px] uppercase tracking-wider text-[var(--color-text-secondary)]">
            {isAr ? "مسار الحالة" : "Status timeline"}
          </p>
          <ol className="flex flex-wrap items-center gap-2">
            {STATUS_FLOW.map((s, idx) => {
              const reached = order.status
                ? STATUS_FLOW.indexOf(order.status) >= idx
                : false;
              const isCurrent = order.status === s;
              return (
                <li key={s} className="flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex h-7 items-center rounded-full px-3 font-mono text-[10px] uppercase tracking-wider",
                      isCurrent
                        ? "bg-[var(--color-primary)] text-white"
                        : reached
                          ? "bg-[var(--color-success)]/15 text-[var(--color-success)]"
                          : "bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]",
                    )}
                  >
                    {orderStatusLabel(s, locale)}
                  </span>
                  {idx < STATUS_FLOW.length - 1 && (
                    <span
                      aria-hidden
                      className={cn(
                        "h-px w-6",
                        reached
                          ? "bg-[var(--color-success)]/40"
                          : "bg-[var(--color-border)]",
                      )}
                    />
                  )}
                </li>
              );
            })}
          </ol>
          {order.status === "cancelled" && (
            <p className="mt-3 inline-flex items-center rounded-full bg-[var(--color-error)]/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--color-error)]">
              {orderStatusLabel("cancelled", locale)}
            </p>
          )}
          <div className="mt-4">
            <span className="me-3 text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
              {isAr ? "تحديث الحالة" : "Update status"}
            </span>
            <StatusDropdown
              orderId={order.id}
              current={status}
              locale={locale}
            />
            <div className="ms-3 inline-block">
              <ReturnOrderDialog
                orderId={order.id}
                returnable={returnable}
                locale={locale}
              />
            </div>
          </div>
        </section>

        {(order.has_returns || existingReturns.length > 0) && (
          <section className="rounded-xl border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/5 p-5 print:hidden">
            <header className="mb-3">
              <h2 className="font-display text-base text-[var(--color-text)]">
                {isAr ? "الإرجاعات السابقة" : "Previous returns"}
              </h2>
              <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                {isAr
                  ? `إجمالي مسترد: ${formatPriceEGP(order.returns_total ?? 0)}`
                  : `Total refunded: ${formatPriceEGP(order.returns_total ?? 0)}`}
              </p>
            </header>
            {existingReturns.length === 0 ? (
              <p className="text-xs text-[var(--color-text-secondary)]">
                {isAr ? "مفيش تفاصيل" : "No details"}
              </p>
            ) : (
              <ul className="space-y-2">
                {existingReturns.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-3"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--color-text-secondary)]">
                        {new Date(r.createdAt).toLocaleString(
                          isAr ? "ar-EG" : "en-US",
                          { dateStyle: "medium", timeStyle: "short" },
                        )}
                      </span>
                      <span className="font-mono text-sm font-semibold text-[var(--color-primary)]">
                        {formatPriceEGP(r.refundAmount)}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-[var(--color-text)]">
                      <span>
                        <span className="text-[var(--color-text-secondary)]">
                          {isAr ? "السبب: " : "Reason: "}
                        </span>
                        {returnReasonLabel(r.reason, locale)}
                      </span>
                      <span>
                        <span className="text-[var(--color-text-secondary)]">
                          {isAr ? "طريقة الاسترداد: " : "Refund: "}
                        </span>
                        {refundMethodLabel(r.refundMethod, locale)}
                      </span>
                      <span>
                        <span className="text-[var(--color-text-secondary)]">
                          {isAr ? "عدد الأصناف: " : "Items: "}
                        </span>
                        {r.itemCount}
                      </span>
                    </div>
                    {r.notes ? (
                      <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
                        {r.notes}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* COD tracking */}
        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5 print:hidden">
          <p className="mb-3 text-[10px] uppercase tracking-wider text-[var(--color-text-secondary)]">
            {isAr ? "تتبع الشحن (COD)" : "COD tracking"}
          </p>
          <form action={saveCodTracking} className="grid gap-3 md:grid-cols-2">
            <input type="hidden" name="orderId" value={order.id} />
            <label className="text-sm">
              <span className="mb-1 block text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
                {isAr ? "شركة الشحن" : "Courier"}
              </span>
              <input
                name="courierName"
                defaultValue={cod?.courier_name ?? ""}
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
                {isAr ? "رقم التتبع" : "Tracking #"}
              </span>
              <input
                name="trackingNumber"
                defaultValue={cod?.tracking_number ?? ""}
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 font-mono text-sm focus:border-[var(--color-accent)] focus:outline-none"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
                {isAr ? "الحالة الحالية" : "Current status"}
              </span>
              <input
                name="currentStatus"
                defaultValue={cod?.current_status ?? ""}
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
                {isAr ? "المكان الحالي" : "Current location"}
              </span>
              <input
                name="currentLocation"
                defaultValue={cod?.current_location ?? ""}
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none"
              />
            </label>
            <div className="md:col-span-2">
              <button
                type="submit"
                className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white"
              >
                {isAr ? "حفظ التتبع" : "Save tracking"}
              </button>
            </div>
          </form>
        </section>
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

function DL({
  label,
  value,
  strong,
  mono,
}: {
  label: string;
  value: string | null;
  strong?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-[10px] uppercase tracking-wider text-[var(--color-text-secondary)]">
        {label}
      </dt>
      <dd
        className={cn(
          mono && "font-mono text-[12px]",
          strong && "font-semibold text-[var(--color-primary)]",
          !mono && !strong && "text-[var(--color-text)]",
        )}
      >
        {value || "—"}
      </dd>
    </div>
  );
}
