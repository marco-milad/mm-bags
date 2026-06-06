import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : undefined;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      ...(supabaseHostname
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseHostname,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
      // Unsplash — used for hero, mood board, category cards, and product seed
      // images until real photography lands.
      { protocol: "https" as const, hostname: "images.unsplash.com" },
      // Shopify CDN — imported Milano product imagery from bsbags-eg.com.
      // Temporary; replace with images hosted on Supabase Storage before launch.
      { protocol: "https" as const, hostname: "cdn.shopify.com" },
      // Jumia Egypt CDN — imported women's bag imagery from jumia.com.eg.
      // Temporary; replace with images hosted on Supabase Storage before launch.
      { protocol: "https" as const, hostname: "eg.jumia.is" },
    ],
    // Imported Shopify CDN images can be large (1-1.5MB PNGs). Keep optimized
    // results in the on-disk cache for a week so cold compiles and slow first
    // hits don't keep re-fetching from upstream.
    minimumCacheTTL: 60 * 60 * 24 * 7,
  },
  experimental: {
    // Default Sharp processing timeout is 7s — too tight for the larger Shopify
    // CDN PNGs (e.g. Calvin Klein 3-piece set, ~1.5MB), which produced 504s
    // through /_next/image. Bump to 30s.
    imgOptTimeoutInSeconds: 30,
  },
  async redirects() {
    return [
      { source: "/products/buy-it-now", destination: "/products/milano-silicone-310", permanent: true },
      { source: "/products/untitled-may26_19-58", destination: "/products/milano", permanent: true },
      { source: "/collections/all", destination: "/catalog", permanent: true },
    ];
  },
};

export default nextConfig;
