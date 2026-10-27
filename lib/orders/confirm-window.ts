/**
 * The "we'll confirm your order within 24 hours" promise. The clock starts at
 * the order's created_at (not business hours — Marco's call, 2026-10-27).
 * The admin flags an order as late a few hours before the promise runs out,
 * so there is still time to call the customer. Pure; see
 * __tests__/confirm-window.test.ts.
 */
import type { OrderStatus, PaymentMethod, PaymentStatus } from "@/lib/supabase/types";

export const CONFIRM_WITHIN_HOURS = 24;
export const LATE_AFTER_HOURS = 20;

const HOUR_MS = 60 * 60 * 1000;

type OrderForWindow = {
  status: OrderStatus | null;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus | null;
  created_at: string;
};

/**
 * True while the order is waiting for the team to confirm it. An InstaPay
 * order that hasn't been paid is waiting on the customer instead (it has its
 * own payment deadline), so the 24-hour promise doesn't apply to it.
 */
export function awaitingConfirmation(o: Omit<OrderForWindow, "created_at">): boolean {
  if ((o.status ?? "pending") !== "pending") return false;
  return !(o.payment_method === "instapay" && o.payment_status !== "paid");
}

export function confirmDeadline(createdAt: string): Date {
  return new Date(new Date(createdAt).getTime() + CONFIRM_WITHIN_HOURS * HOUR_MS);
}

/** Admin flag: still unconfirmed LATE_AFTER_HOURS after it was placed. */
export function confirmationLate(o: OrderForWindow, now: number): boolean {
  if (!awaitingConfirmation(o)) return false;
  return now - new Date(o.created_at).getTime() >= LATE_AFTER_HOURS * HOUR_MS;
}

/** Ids of the orders past the admin's "late" mark. */
export function lateOrderIds(
  orders: ReadonlyArray<OrderForWindow & { id: string }>,
  now: number = Date.now(),
): Set<string> {
  return new Set(orders.filter((o) => confirmationLate(o, now)).map((o) => o.id));
}

/** Orders created at or before this are old enough to be late (DB prefilter). */
export function lateCutoffISO(now: number = Date.now()): string {
  return new Date(now - LATE_AFTER_HOURS * HOUR_MS).toISOString();
}

/** Whole hours left before the promise runs out (negative once it has). */
export function hoursLeft(createdAt: string, now: number = Date.now()): number {
  return Math.floor((confirmDeadline(createdAt).getTime() - now) / HOUR_MS);
}

/** "الأربعاء 28 أكتوبر، 2:15 م" — Cairo time, for the customer. */
export function formatDeadline(date: Date, locale: string): string {
  return date.toLocaleString(locale === "ar" ? "ar-EG" : "en-GB", {
    timeZone: "Africa/Cairo",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
