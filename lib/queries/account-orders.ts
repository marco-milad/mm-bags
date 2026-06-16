import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { OrderStatus, PaymentMethod } from "@/lib/supabase/types";

/**
 * Storefront-facing order history for a signed-in user.
 *
 * Uses the admin client so we can read across RLS — the page calls
 * this only after verifying the user owns the orders (the WHERE
 * `user_id = userId` clause does the actual gate). Returns a narrow
 * row shape suitable for an account-overview list (item count +
 * total + status + date).
 */

export type AccountOrderRow = {
  id: string;
  order_number: string;
  status: OrderStatus;
  payment_method: PaymentMethod;
  total: number;
  item_count: number;
  created_at: string;
};

export async function getRecentUserOrders(
  userId: string,
  limit = 10,
): Promise<AccountOrderRow[]> {
  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from("orders")
    .select("id, order_number, status, payment_method, total, created_at, items:order_items(id)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  const raw = (data ?? []) as unknown as Array<{
    id: string;
    order_number: string;
    status: OrderStatus | null;
    payment_method: PaymentMethod;
    total: number;
    created_at: string;
    items: Array<{ id: string }> | null;
  }>;
  return raw.map((r) => ({
    id: r.id,
    order_number: r.order_number,
    status: r.status ?? "pending",
    payment_method: r.payment_method,
    total: r.total,
    item_count: r.items?.length ?? 0,
    created_at: r.created_at,
  }));
}

/** Wishlist count for the account overview card. */
export async function getUserWishlistCount(userId: string): Promise<number> {
  const admin = getSupabaseAdminClient();
  const { count } = await admin
    .from("wishlists")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  return count ?? 0;
}
