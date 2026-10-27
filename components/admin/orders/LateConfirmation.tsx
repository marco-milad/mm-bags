import Link from "next/link";
import { CONFIRM_WITHIN_HOURS, hoursLeft } from "@/lib/orders/confirm-window";
import type { LateOrder } from "@/lib/queries/admin-orders";

/** Pending order past the "late" mark — the 24-hour promise is running out. */
export function LateBadge({ isAr }: { isAr: boolean }) {
  return (
    <span className="ms-1 inline-flex items-center rounded-full bg-[var(--color-error)]/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--color-error)]">
      {isAr ? "متأخر" : "Late"}
    </span>
  );
}

/** Orders-page banner listing every late order, whatever the filters. */
export function LateBanner({ orders, isAr }: { orders: LateOrder[]; isAr: boolean }) {
  return (
    <div
      role="status"
      className="rounded-lg border border-[var(--color-error)]/40 bg-[var(--color-error)]/5 p-3 text-sm"
    >
      <p className="font-semibold text-[var(--color-error)]">
        {isAr
          ? `${orders.length} طلب لسه ماتأكدش — العميل اتوعد بتأكيد خلال ${CONFIRM_WITHIN_HOURS} ساعة من الطلب`
          : `${orders.length} order${orders.length === 1 ? "" : "s"} still unconfirmed — customers were promised a confirmation within ${CONFIRM_WITHIN_HOURS} hours of ordering`}
      </p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {orders.map((o) => (
          <li key={o.id}>
            <Link
              href={`/admin/orders/${o.id}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-error)]/40 bg-[var(--color-bg)] px-3 py-1 font-mono text-[11px] text-[var(--color-text)] hover:border-[var(--color-error)]"
            >
              {o.order_number}
              <span className="text-[var(--color-error)]">
                <TimeLeft createdAt={o.created_at} isAr={isAr} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** "فاضل 3 س" / "عدّى الميعاد". */
export function TimeLeft({ createdAt, isAr }: { createdAt: string; isAr: boolean }) {
  const left = hoursLeft(createdAt);
  if (left < 0) return <>{isAr ? "عدّى الميعاد" : "overdue"}</>;
  return <>{isAr ? `فاضل ${left} س` : `${left}h left`}</>;
}
