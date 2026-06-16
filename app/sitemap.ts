import type { MetadataRoute } from "next";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/seo/site";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

/**
 * Dynamic sitemap. Enumerates every public-facing URL across both
 * locales: static pages, active products, and every collection.
 *
 * Priorities + changeFrequency per the SEO spec:
 *   homepage   priority 1.0  daily
 *   product    priority 0.8  weekly
 *   collection priority 0.7  weekly
 *   static     priority 0.5  monthly
 *
 * Both ar/ and en/ variants are emitted so crawlers can index each
 * locale; hreflang on the pages themselves tells them which is
 * canonical. The /admin / /checkout / /auth / /account paths are
 * intentionally absent — robots.ts blocks them.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const admin = getSupabaseAdminClient();
  const [productsRes, collectionsRes] = await Promise.all([
    admin
      .from("products")
      .select("slug, updated_at")
      .eq("is_active", true)
      .order("updated_at", { ascending: false }),
    admin
      .from("collections")
      .select("slug, created_at")
      .eq("is_active", true),
  ]);

  const products = productsRes.data ?? [];
  const collections = collectionsRes.data ?? [];

  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  const localePaths = ["ar", "en"] as const;

  // Static pages — same priority everywhere.
  const STATIC: ReadonlyArray<{
    path: string;
    priority: number;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  }> = [
    { path: "", priority: 1.0, changeFrequency: "daily" },
    { path: "/categories", priority: 0.6, changeFrequency: "weekly" },
    { path: "/catalog", priority: 0.7, changeFrequency: "weekly" },
    { path: "/about", priority: 0.5, changeFrequency: "monthly" },
    { path: "/faq", priority: 0.5, changeFrequency: "monthly" },
    { path: "/contact", priority: 0.5, changeFrequency: "monthly" },
    { path: "/track", priority: 0.4, changeFrequency: "monthly" },
  ];

  for (const locale of localePaths) {
    for (const s of STATIC) {
      entries.push({
        url: `${SITE_URL}/${locale}${s.path}`,
        lastModified: now,
        changeFrequency: s.changeFrequency,
        priority: s.priority,
        // Hreflang alternates: each entry advertises both languages so
        // Search Console understands the cluster.
        alternates: {
          languages: {
            ar: `${SITE_URL}/ar${s.path}`,
            en: `${SITE_URL}/en${s.path}`,
          },
        },
      });
    }

    // Products
    for (const p of products) {
      entries.push({
        url: `${SITE_URL}/${locale}/products/${p.slug}`,
        lastModified: p.updated_at ? new Date(p.updated_at) : now,
        changeFrequency: "weekly",
        priority: 0.8,
        alternates: {
          languages: {
            ar: `${SITE_URL}/ar/products/${p.slug}`,
            en: `${SITE_URL}/en/products/${p.slug}`,
          },
        },
      });
    }

    // Collections
    for (const c of collections) {
      entries.push({
        url: `${SITE_URL}/${locale}/catalog/${c.slug}`,
        lastModified: c.created_at ? new Date(c.created_at) : now,
        changeFrequency: "weekly",
        priority: 0.7,
        alternates: {
          languages: {
            ar: `${SITE_URL}/ar/catalog/${c.slug}`,
            en: `${SITE_URL}/en/catalog/${c.slug}`,
          },
        },
      });
    }
  }

  return entries;
}
