import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Admin queries for /admin/newsletter — subscribers list + stats.
 *
 * Storage table: public.newsletter_subscribers
 * (id, email, locale, subscribed_at, is_active)
 */

export type NewsletterSubscriberRow = {
  id: string;
  email: string;
  locale: "ar" | "en";
  subscribed_at: string;
  is_active: boolean;
};

export type NewsletterFilters = {
  q?: string;
  /** "active" | "inactive" | undefined (any). */
  status?: "active" | "inactive";
  locale?: "ar" | "en";
};

export async function listNewsletterSubscribers(
  filters: NewsletterFilters = {},
): Promise<NewsletterSubscriberRow[]> {
  const admin = getSupabaseAdminClient();
  let q = admin
    .from("newsletter_subscribers")
    .select("*")
    .order("subscribed_at", { ascending: false })
    .limit(2000);

  if (filters.status === "active") q = q.eq("is_active", true);
  if (filters.status === "inactive") q = q.eq("is_active", false);
  if (filters.locale) q = q.eq("locale", filters.locale);
  if (filters.q?.trim()) {
    const safe = filters.q.trim().replace(/[*,()]/g, " ");
    q = q.ilike("email", `%${safe}%`);
  }

  const { data } = await q;
  return (data ?? []) as NewsletterSubscriberRow[];
}

export type NewsletterStats = {
  total: number;
  active: number;
  ar: number;
  en: number;
};

export async function getNewsletterStats(): Promise<NewsletterStats> {
  const admin = getSupabaseAdminClient();
  const [totalRes, activeRes, arRes, enRes] = await Promise.all([
    admin
      .from("newsletter_subscribers")
      .select("id", { count: "exact", head: true }),
    admin
      .from("newsletter_subscribers")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    admin
      .from("newsletter_subscribers")
      .select("id", { count: "exact", head: true })
      .eq("locale", "ar")
      .eq("is_active", true),
    admin
      .from("newsletter_subscribers")
      .select("id", { count: "exact", head: true })
      .eq("locale", "en")
      .eq("is_active", true),
  ]);
  return {
    total: totalRes.count ?? 0,
    active: activeRes.count ?? 0,
    ar: arRes.count ?? 0,
    en: enRes.count ?? 0,
  };
}
