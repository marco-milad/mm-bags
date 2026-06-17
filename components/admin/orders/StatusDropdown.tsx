"use client";

import { Loader2 } from "lucide-react";
import { useTransition } from "react";
import { updateOrderStatus } from "@/lib/admin/order-actions";
import { orderStatusLabel, ORDER_STATUSES } from "@/lib/admin/labels";
import type { AdminLocale } from "@/lib/admin/locale";
import type { OrderStatus } from "@/lib/supabase/types";

/**
 * Inline status dropdown for each row of /admin/orders. We don't use
 * a save button — picking a new value POSTs the server action and
 * the row revalidates. Side effect: changing to "delivered" also
 * fires the post-delivery WhatsApp prompt (handled inside the
 * action).
 */
export function StatusDropdown({
  orderId,
  current,
  locale,
}: {
  orderId: string;
  current: OrderStatus;
  locale: AdminLocale;
}) {
  const [pending, startTransition] = useTransition();
  const isAr = locale === "ar";

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as OrderStatus;
    if (next === current) return;
    // Confirm on the only transition that fires a paid WhatsApp send
    // to the customer.
    if (
      next === "delivered" &&
      !window.confirm(
        isAr
          ? "تأكيد تسليم الطلب؟ هيتبعت طلب تقييم على واتساب للعميل."
          : "Mark this order delivered? A WhatsApp review request will be sent to the customer.",
      )
    ) {
      e.target.value = current;
      return;
    }
    const formData = new FormData();
    formData.set("id", orderId);
    formData.set("status", next);
    startTransition(async () => {
      await updateOrderStatus(formData);
    });
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <select
        value={current}
        onChange={onChange}
        disabled={pending}
        className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs disabled:opacity-60"
      >
        {ORDER_STATUSES.map((s) => (
          <option key={s} value={s}>
            {orderStatusLabel(s, locale)}
          </option>
        ))}
      </select>
      {pending && (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--color-text-secondary)]" />
      )}
    </span>
  );
}
