"use client";

import { Loader2 } from "lucide-react";
import { useTransition } from "react";
import { updateOrderStatus } from "@/lib/admin/order-actions";
import type { OrderStatus } from "@/lib/supabase/types";

const STATUSES: ReadonlyArray<{ value: OrderStatus; label: string }> = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "out_for_delivery", label: "Out for delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

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
}: {
  orderId: string;
  current: OrderStatus;
}) {
  const [pending, startTransition] = useTransition();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as OrderStatus;
    if (next === current) return;
    // Confirm on the only transition that fires a paid WhatsApp send
    // to the customer. A native <select> can change value on scroll/
    // keyboard-arrow, and one misclick on a dense table = one
    // unwanted billable send.
    if (
      next === "delivered" &&
      !window.confirm(
        "Mark this order delivered? A WhatsApp review request will be sent to the customer.",
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
        {STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      {pending && (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--color-text-secondary)]" />
      )}
    </span>
  );
}
