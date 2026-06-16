import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/seo/site";

export const runtime = "edge";
export const contentType = "image/png";
export const size = { width: 1200, height: 630 };

/**
 * GET /api/og?title=…&subtitle=…&image=…&price=…
 *
 * Dynamic Open Graph image used by product, collection, and any
 * other page's Metadata.openGraph.images entry. Uses next/og's
 * Satori-backed `ImageResponse` for fast edge rendering.
 *
 * Falls back to a brand-only card when no `title` is provided —
 * suitable as a default for the homepage / generic shares.
 *
 * Keep the JSX flat. Satori supports a subset of CSS — no flex-row
 * + flex-col with `gap`, no transforms, no background-image with
 * gradients beyond two stops. Stick to known-good primitives.
 */
export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const title = sp.get("title");
  const subtitle = sp.get("subtitle") ?? "";
  const productImage = sp.get("image");
  const price = sp.get("price");

  // Brand colors mirror the storefront tokens — written as hex so
  // Satori doesn't need to resolve CSS variables.
  const NAVY = "#0d2540";
  const BRASS = "#c89b3c";
  const PAPER = "#f7f3eb";

  // Brand-only fallback (no title param) — the default share image.
  if (!title) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: NAVY,
            color: PAPER,
            padding: 80,
          }}
        >
          <div
            style={{
              fontSize: 96,
              fontWeight: 700,
              letterSpacing: "-2px",
              color: PAPER,
            }}
          >
            {SITE_NAME}
          </div>
          <div
            style={{
              fontSize: 32,
              color: BRASS,
              marginTop: 24,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            Travel smart · Travel in style
          </div>
          <div
            style={{
              fontSize: 22,
              color: "rgba(247, 243, 235, 0.7)",
              marginTop: 32,
              maxWidth: 800,
              textAlign: "center",
              lineHeight: 1.4,
            }}
          >
            Premium travel & everyday bags · Shipping across all 27 Egyptian governorates · Cash on delivery
          </div>
        </div>
      ),
      { ...size },
    );
  }

  // Product / page card: optional left-side image, right-side title +
  // price. Image is fetched by Satori from the URL — must be HTTPS
  // and reachable from edge runtime.
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: PAPER,
        }}
      >
        {productImage && (
          <div
            style={{
              width: 540,
              height: 630,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: NAVY,
            }}
          >
            <img
              src={productImage}
              alt=""
              width={480}
              height={480}
              style={{ objectFit: "cover", borderRadius: 16 }}
            />
          </div>
        )}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: 64,
            color: NAVY,
          }}
        >
          <div
            style={{
              fontSize: 22,
              color: BRASS,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              marginBottom: 24,
            }}
          >
            {SITE_NAME}
          </div>
          <div
            style={{
              fontSize: 56,
              fontWeight: 700,
              lineHeight: 1.1,
              color: NAVY,
              maxWidth: productImage ? 520 : 1000,
            }}
          >
            {title}
          </div>
          {subtitle && (
            <div
              style={{
                fontSize: 26,
                color: "rgba(13, 37, 64, 0.65)",
                marginTop: 20,
                lineHeight: 1.4,
                maxWidth: productImage ? 520 : 1000,
              }}
            >
              {subtitle}
            </div>
          )}
          {price && (
            <div
              style={{
                fontSize: 44,
                fontWeight: 700,
                color: NAVY,
                marginTop: 40,
                padding: "10px 24px",
                background: BRASS,
                borderRadius: 9999,
                display: "flex",
                alignSelf: "flex-start",
              }}
            >
              {price} EGP
            </div>
          )}
        </div>
      </div>
    ),
    { ...size },
  );
}
