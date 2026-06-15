import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { NotificationChannel } from "@/lib/supabase/types";

/**
 * Admin queries for the back-in-stock notification waitlist.
 *
 * The schema (notification_subscriptions) tracks one row per
 * (variant, contact, channel) tuple. The admin view groups them by
 * variant so the operator can fire ONE notification batch per
 * variant when stock arrives.
 */

export type WaitlistSubscriber = {
  id: string;
  guest_email: string | null;
  guest_phone: string | null;
  channel: NotificationChannel;
  notified: boolean;
  created_at: string;
};

export type WaitlistGroup = {
  productId: string;
  productName: string;
  productSlug: string;
  variantId: string;
  variantLabel: string;
  colorHex: string | null;
  /** Current stock for THIS variant — drives the "ready to send"
      affordance (orange = still 0, green = back in stock). */
  stockQty: number;
  pendingCount: number;
  subscribers: WaitlistSubscriber[];
};

export type WaitlistFilters = {
  status?: "pending" | "all";
  productId?: string;
};

export async function listWaitlistGroups(
  filters: WaitlistFilters = {},
): Promise<WaitlistGroup[]> {
  const admin = getSupabaseAdminClient();
  let q = admin
    .from("notification_subscriptions")
    .select(
      "id, guest_email, guest_phone, channel, notified, created_at, " +
      "product_id, variant_id, " +
      "product:products(name_ar, name_en, slug), " +
      "variant:product_variants(color_ar, color_en, color_hex, size_inches, size_label_ar, stock_qty)",
    )
    .order("created_at", { ascending: false })
    .limit(2000);

  if (filters.status === "pending" || !filters.status) {
    q = q.eq("notified", false);
  }
  if (filters.productId) q = q.eq("product_id", filters.productId);

  const { data } = await q;
  const raw = (data ?? []) as unknown as Array<{
    id: string;
    guest_email: string | null;
    guest_phone: string | null;
    channel: NotificationChannel;
    notified: boolean;
    created_at: string;
    product_id: string | null;
    variant_id: string | null;
    product:
      | { name_ar: string; name_en: string; slug: string }
      | Array<{ name_ar: string; name_en: string; slug: string }>
      | null;
    variant:
      | {
          color_ar: string | null;
          color_en: string | null;
          color_hex: string | null;
          size_inches: number | null;
          size_label_ar: string | null;
          stock_qty: number | null;
        }
      | Array<{
          color_ar: string | null;
          color_en: string | null;
          color_hex: string | null;
          size_inches: number | null;
          size_label_ar: string | null;
          stock_qty: number | null;
        }>
      | null;
  }>;

  const groups = new Map<string, WaitlistGroup>();
  for (const r of raw) {
    if (!r.variant_id || !r.product_id) continue;
    const product = Array.isArray(r.product) ? r.product[0] : r.product;
    const variant = Array.isArray(r.variant) ? r.variant[0] : r.variant;
    if (!product || !variant) continue;

    const variantLabel =
      [
        variant.color_ar ?? variant.color_en,
        variant.size_inches
          ? `${variant.size_inches}"`
          : variant.size_label_ar,
      ]
        .filter(Boolean)
        .join(" · ") || "—";

    const sub: WaitlistSubscriber = {
      id: r.id,
      guest_email: r.guest_email,
      guest_phone: r.guest_phone,
      channel: r.channel,
      notified: r.notified,
      created_at: r.created_at,
    };
    const existing = groups.get(r.variant_id);
    if (existing) {
      existing.subscribers.push(sub);
      if (!sub.notified) existing.pendingCount += 1;
    } else {
      groups.set(r.variant_id, {
        productId: r.product_id,
        productName: product.name_ar ?? product.name_en,
        productSlug: product.slug,
        variantId: r.variant_id,
        variantLabel,
        colorHex: variant.color_hex,
        stockQty: variant.stock_qty ?? 0,
        pendingCount: sub.notified ? 0 : 1,
        subscribers: [sub],
      });
    }
  }

  return Array.from(groups.values()).sort(
    (a, b) => b.pendingCount - a.pendingCount,
  );
}

// ─── Stats for the page header ──────────────────────────────────────
export type WaitlistStats = {
  pendingTotal: number;
  productsWithPending: number;
};

export async function getWaitlistStats(): Promise<WaitlistStats> {
  const admin = getSupabaseAdminClient();
  const [pendingCountRes, productsRes] = await Promise.all([
    admin
      .from("notification_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("notified", false),
    admin
      .from("notification_subscriptions")
      .select("product_id")
      .eq("notified", false),
  ]);
  const productSet = new Set<string>();
  for (const r of productsRes.data ?? []) {
    if (r.product_id) productSet.add(r.product_id);
  }
  return {
    pendingTotal: pendingCountRes.count ?? 0,
    productsWithPending: productSet.size,
  };
}

/**
 * Lightweight product filter dropdown — only the products that
 * currently have at least one pending waitlist entry.
 */
export type WaitlistProductOption = {
  id: string;
  name: string;
  pendingCount: number;
};

export async function listWaitlistProducts(): Promise<WaitlistProductOption[]> {
  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from("notification_subscriptions")
    .select("product_id, product:products(name_ar, name_en)")
    .eq("notified", false);
  const raw = (data ?? []) as unknown as Array<{
    product_id: string | null;
    product:
      | { name_ar: string; name_en: string }
      | Array<{ name_ar: string; name_en: string }>
      | null;
  }>;
  const map = new Map<string, WaitlistProductOption>();
  for (const r of raw) {
    if (!r.product_id) continue;
    const product = Array.isArray(r.product) ? r.product[0] : r.product;
    if (!product) continue;
    const existing = map.get(r.product_id);
    if (existing) {
      existing.pendingCount += 1;
    } else {
      map.set(r.product_id, {
        id: r.product_id,
        name: product.name_ar ?? product.name_en,
        pendingCount: 1,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}
