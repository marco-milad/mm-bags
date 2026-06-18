import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : undefined;

const nextConfig: NextConfig = {
  // Keep the chromium binary + puppeteer's native bindings out of the
  // serverless bundle. They're loaded at runtime by /admin/reports/export-pdf
  // via the @sparticuz/chromium serverless build; bundling them through
  // webpack would mangle the native code paths.
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core", "sharp"],
  images: {
    remotePatterns: [
      ...(supabaseHostname
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseHostname,
              pathname: "/storage/v1/object/public/**",
            },
            // Supabase render-image (transform) endpoint. The custom
            // next/image loader (lib/images/supabase-loader.ts) rewrites
            // every Supabase product URL through this path so we get
            // on-demand WebP + per-breakpoint widths at the edge.
            {
              protocol: "https" as const,
              hostname: supabaseHostname,
              pathname: "/storage/v1/render/image/public/**",
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
    // Custom loader: every `<Image>` runs through the Supabase
    // transform endpoint when the src is one of our own Storage URLs;
    // external URLs (Unsplash placeholders, etc.) are returned
    // unchanged. See lib/images/supabase-loader.ts for the rules.
    // `formats` is ignored when a custom loader is configured (the
    // built-in /_next/image optimiser is bypassed), but keeping the
    // declaration documents what we'd serve if we ever switched back.
    loader: "custom",
    loaderFile: "./lib/images/supabase-loader.ts",
    formats: ["image/avif", "image/webp"],
    // Trimmed from the default 8-step ladder. We're a mobile-first store
    // and cap our source images at 1600px on the long edge (see the
    // Supabase loader + the admin upload guardrail), so anything above
    // 1600 would just upscale and waste optimizer cache.
    deviceSizes: [360, 640, 750, 828, 1080, 1200, 1600],
    // Optimized results stay in the on-disk cache for a week so cold
    // compiles and slow first hits don't keep re-fetching from upstream.
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
