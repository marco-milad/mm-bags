import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import type { AccountOrderRow } from "@/lib/queries/account-orders";
import type { Locale } from "@/lib/i18n-config";
import { cn, formatPriceEGP } from "@/lib/utils";

const STATUS_AR: Record<string, string> = {
  pending: "في انتظار التأكيد",
  confirmed: "اتأكد",
  processing: "جاري التحضير",
  shipped: "اتشحن",
  out_for_delivery: "في الطريق",
  delivered: "اتسلم",
  cancelled: "اتلغى",
};

const STATUS_CLS: Record<string, string> = {
  pending: "bg-[var(--color-warning)]/15 text-[var(--color-warning)]",
  confirmed: "bg-[var(--color-accent)]/15 text-[var(--color-accent-dark)]",
  processing: "bg-[var(--color-accent)]/15 text-[var(--color-accent-dark)]",
  shipped: "bg-[var(--color-primary)]/15 text-[var(--color-primary)]",
  out_for_delivery:
    "bg-[var(--color-primary)]/15 text-[var(--color-primary)]",
  delivered: "bg-[var(--color-success)]/15 text-[var(--color-success)]",
  cancelled: "bg-[var(--color-error)]/15 text-[var(--color-error)]",
};

/**
 * Last-N orders for the signed-in user, rendered as a compact list.
 * Each row links to /track/{order_number} which the storefront's
 * existing order-tracking page handles.
 */
export function OrdersHistory({
  locale,
  orders,
}: {
  locale: Locale;
  orders: AccountOrderRow[];
}) {
  const isRTL = locale === "ar";

  if (orders.length === 0) {
    return (
      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--color-accent-dark)]">
          {isRTL ? "طلباتي" : "Orders"}
        </p>
        <h2 className="mt-1 font-display text-xl text-[var(--color-text)]">
          {isRTL ? "لسه مفيش طلبات" : "No orders yet"}
        </h2>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          {isRTL
            ? "أول طلب ليك هيظهر هنا مع كل التفاصيل."
            : "Your first order will show up here with full details."}
        </p>
        <Link
          href={`/${locale}/catalog`}
          className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-primary)]/90"
        >
          <ShoppingBag className="h-4 w-4" />
          {isRTL ? "ابدأ التسوق" : "Browse the catalog"}
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <header className="mb-4 flex items-baseline justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--color-accent-dark)]">
            {isRTL ? "طلباتي" : "Orders"}
          </p>
          <h2 className="mt-1 font-display text-xl text-[var(--color-text)]">
            {isRTL ? "آخر طلباتك" : "Recent orders"}
          </h2>
        </div>
        <span className="text-[11px] text-[var(--color-text-secondary)]">
          {orders.length}
        </span>
      </header>

      <ul className="divide-y divide-[var(--color-border)]">
        {orders.map((o) => {
          const status = o.status ?? "pending";
          return (
            <li key={o.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="flex min-w-0 flex-1 flex-col">
                <Link
                  href={`/${locale}/track?id=${o.order_number}`}
                  className="font-mono text-[11px] font-semibold text-[var(--color-text)] hover:underline"
                >
                  {o.order_number}
                </Link>
                <p className="text-[11px] text-[var(--color-text-secondary)]">
                  {new Date(o.created_at).toLocaleDateString(
                    isRTL ? "ar-EG" : "en-US",
                    { dateStyle: "medium" },
                  )}{" "}
                  · {o.item_count}{" "}
                  {isRTL
                    ? "منتج"
                    : o.item_count === 1
                      ? "item"
                      : "items"}
                </p>
              </div>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
                  STATUS_CLS[status] ??
                    "bg-[var(--color-surface)] text-[var(--color-text-secondary)]",
                )}
              >
                {isRTL ? STATUS_AR[status] ?? status : status.replace(/_/g, " ")}
              </span>
              <span className="font-mono text-sm font-semibold text-[var(--color-primary)]">
                {formatPriceEGP(o.total, locale)}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
