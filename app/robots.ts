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
        // /api/og is the share-preview image: the longer (more specific)
        // allow wins over the /api disallow, so link-preview bots that obey
        // robots.txt can fetch it (audit T12).
        allow: ["/", "/api/og"],
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
          "/ar/o/",
          "/en/o/",
          "/ar/cart",
          "/en/cart",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
