import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/site";

/**
 * robots.txt — allow public storefront pages, block admin + auth +
 * checkout + account so crawlers don't index session-only routes.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/api",
          "/api/",
          "/auth",
          "/auth/",
          "/ar/auth",
          "/en/auth",
          "/ar/account",
          "/en/account",
          "/ar/checkout",
          "/en/checkout",
          "/ar/order-confirmation",
          "/en/order-confirmation",
          "/ar/cart",
          "/en/cart",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
