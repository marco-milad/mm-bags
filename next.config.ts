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
      // Placeholder images for seed data — remove once real product photos are uploaded.
      { protocol: "https" as const, hostname: "picsum.photos" },
    ],
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
