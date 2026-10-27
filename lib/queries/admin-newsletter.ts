import "server-only";

import { requireStaff } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SubscriberStatus } from "@/lib/supabase/types";

/**
 * Admin queries for /admin/newsletter — subscribers list + stats.
 *
 * Storage: public.newsletter_subscribers (+ status/reviewed_at since 0029)
 * and public.coupons (one personal code per approved subscriber).
 */

export type SubscriberCoupon = {
  code: string;
  expires_at: string | null;
  used_at: string | null;
  order_id: string | null;
  order_number: string | null;
};

export type NewsletterSubscriberRow = {
  id: string;
  email: string;
  locale: "ar" | "en";
  subscribed_at: string;
  is_active: boolean;
  /** "pending" until reviewed. Missing before migration 0029 → treated as pending. */
  status: SubscriberStatus;
  reviewed_at: string | null;
  coupon: SubscriberCoupon | null;
};

export type NewsletterFilters = {
  q?: string;
  /** "active" | "inactive" | undefined (any). */
  status?: "active" | "inactive";
  locale?: "ar" | "en";
  /** Owner review state. */
  review?: SubscriberStatus;
};

type RawRow = {
  id: string;
  email: string;
  locale: "ar" | "en";
  subscribed_at: string;
  is_active: boolean;
  status?: SubscriberStatus;
  reviewed_at?: string | null;
  coupons?:
    | {
        code: string;
        expires_at: string | null;
        used_at: string | null;
        order_id: string | null;
        orders: { order_number: string } | null;
      }
    | Array<{
        code: string;
        expires_at: string | null;
        used_at: string | null;
        order_id: string | null;
        orders: { order_number: string } | null;
      }>
    | null;
};

function toRow(r: RawRow): NewsletterSubscriberRow {
  const c = Array.isArray(r.coupons) ? r.coupons[0] : r.coupons;
  return {
    id: r.id,
    email: r.email,
    locale: r.locale,
    subscribed_at: r.subscribed_at,
    is_active: r.is_active,
    status: r.status ?? "pending",
    reviewed_at: r.reviewed_at ?? null,
    coupon: c
      ? {
          code: c.code,
          expires_at: c.expires_at,
          used_at: c.used_at,
          order_id: c.order_id,
          order_number: c.orders?.order_number ?? null,
        }
      : null,
  };
}

export async function listNewsletterSubscribers(
  filters: NewsletterFilters = {},
): Promise<NewsletterSubscriberRow[]> {
  await requireStaff();
  const admin = getSupabaseAdminClient();

  const build = (withCoupons: boolean) => {
    let q = admin
      .from("newsletter_subscribers")
      .select(
        withCoupons
          ? "*, coupons(code, expires_at, used_at, order_id, orders(order_number))"
          : "*",
      )
      .order("subscribed_at", { ascending: false })
      .limit(2000);
    if (filters.status === "active") q = q.eq("is_active", true);
    if (filters.status === "inactive") q = q.eq("is_active", false);
    if (filters.locale) q = q.eq("locale", filters.locale);
    if (withCoupons && filters.review) q = q.eq("status", filters.review);
    if (filters.q?.trim()) {
      const safe = filters.q.trim().replace(/[*,()]/g, " ");
      q = q.ilike("email", `%${safe}%`);
    }
    return q;
  };

  const { data, error } = await build(true);
  if (!error) return ((data ?? []) as unknown as RawRow[]).map(toRow);
  // Before migration 0029 the coupons table/status column don't exist yet:
  // still show the list rather than an empty page.
  console.warn("[admin-newsletter] coupon join failed, falling back:", error.message);
  const fallback = await build(false);
  return ((fallback.data ?? []) as unknown as RawRow[]).map(toRow);
}

export type NewsletterStats = {
  total: number;
  active: number;
  ar: number;
  en: number;
  /** Waiting for Marco's decision. */
  pending: number;
};

export async function getNewsletterStats(): Promise<NewsletterStats> {
  await requireStaff();
  const admin = getSupabaseAdminClient();
  const count = () => admin.from("newsletter_subscribers").select("id", { count: "exact", head: true });
  const [totalRes, activeRes, arRes, enRes, pendingRes] = await Promise.all([
    count(),
    count().eq("is_active", true),
    count().eq("locale", "ar").eq("is_active", true),
    count().eq("locale", "en").eq("is_active", true),
    count().eq("status", "pending"),
  ]);
  return {
    total: totalRes.count ?? 0,
    active: activeRes.count ?? 0,
    ar: arRes.count ?? 0,
    en: enRes.count ?? 0,
    pending: pendingRes.error ? 0 : (pendingRes.count ?? 0),
  };
}
