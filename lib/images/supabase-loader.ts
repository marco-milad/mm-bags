/**
 * Custom next/image loader that routes our own Supabase Storage URLs
 * through Supabase's built-in image-transformation endpoint, while
 * passing every other host (Shopify CDN, Jumia, Unsplash, etc.)
 * through unchanged.
 *
 * Why this exists:
 *   - Supabase serves transformed images at `/storage/v1/render/image/public/<path>`
 *     with `?width=W&quality=Q&format=webp`. The transform happens at the
 *     edge with a long cache, so we get on-demand WebP + per-breakpoint
 *     widths without re-encoding source files or generating size variants
 *     at rest. (Pro tier feature; enabled on this project.)
 *   - next/image still handles the responsive srcset + Accept-driven
 *     format selection. The loader's job is just to map (src, width,
 *     quality) → a real URL that returns those bytes.
 *
 * Pass-through is critical:
 *   - External CDN images (cdn.shopify.com, eg.jumia.is,
 *     images.unsplash.com) are still allowed by next.config.ts and
 *     can't be re-routed through Supabase's transform endpoint —
 *     return them verbatim and let /_next/image do its normal thing.
 *   - URLs that already point at `/render/image/public/...` (e.g. a
 *     pre-baked thumbnail URL stored in the DB) are returned with the
 *     width/quality updated rather than double-wrapped.
 *
 * Capping at width ≤ 1600:
 *   - The next.config.ts deviceSizes ladder tops out at 1600 to match
 *     our admin upload guardrail (Phase 4). If a future caller asks
 *     for more, we clamp so the transform endpoint doesn't waste an
 *     upscaling round-trip.
 */

const SUPABASE_PUBLIC_PREFIX = "/storage/v1/object/public/";
const SUPABASE_RENDER_PREFIX = "/storage/v1/render/image/public/";
const MAX_WIDTH = 1600;
const DEFAULT_QUALITY = 82;

export type SupabaseLoaderInput = {
  src: string;
  width: number;
  quality?: number;
};

/**
 * Build the Supabase transform URL for a given source + width.
 * Exported for the loader prop AND for hand-built `<img srcset>` etc.
 */
export function supabaseImageLoader({
  src,
  width,
  quality,
}: SupabaseLoaderInput): string {
  // Bail on non-absolute URLs — never seen in this codebase but a
  // future caller might pass a relative path.
  if (!src.startsWith("http://") && !src.startsWith("https://")) {
    return src;
  }

  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return src;
  }

  const isOurSupabase =
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    url.origin === process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/+$/, "");
  if (!isOurSupabase) {
    return src;
  }

  // Object-public → transform path. Render-image (already-transform)
  // paths are kept as-is so we can adjust width/quality without
  // double-wrapping the URL.
  let renderPath: string;
  if (url.pathname.startsWith(SUPABASE_PUBLIC_PREFIX)) {
    renderPath =
      SUPABASE_RENDER_PREFIX +
      url.pathname.slice(SUPABASE_PUBLIC_PREFIX.length);
  } else if (url.pathname.startsWith(SUPABASE_RENDER_PREFIX)) {
    renderPath = url.pathname;
  } else {
    // Some other Supabase path (auth, etc.) — leave alone.
    return src;
  }

  const w = Math.min(Math.max(1, Math.round(width)), MAX_WIDTH);
  const q = Math.min(
    Math.max(20, Math.round(quality ?? DEFAULT_QUALITY)),
    100,
  );

  const out = new URL(renderPath, url.origin);
  out.searchParams.set("width", String(w));
  out.searchParams.set("quality", String(q));
  out.searchParams.set("format", "webp");
  // `resize=contain` would letterbox; the storefront uses object-cover
  // / object-contain in CSS, so the transform shouldn't impose its own
  // resize mode beyond fitting within the width bound.
  out.searchParams.set("resize", "contain");
  return out.toString();
}
