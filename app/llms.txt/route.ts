import { getTopLevelCategoriesWithCounts } from "@/lib/queries/categories";
import { SITE_DESCRIPTION_EN, SITE_URL } from "@/lib/seo/site";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/checkout/schema";
import { getActiveShippingZones } from "@/lib/shipping/zones";
import {
  COD_FEE_BAND,
  COD_FEE_BASE,
  COD_FEE_STEP,
  DELIVERY_HOURS_MAX,
  DELIVERY_HOURS_MIN,
  feeRange,
} from "@/lib/shipping/shared";
import { GUIDES } from "@/lib/guides";

// Regenerated hourly: collections and their "from" prices come from the DB.
export const revalidate = 3600;

/**
 * /llms.txt — a plain-markdown fact sheet for AI answer engines
 * (https://llmstxt.org). Everything here mirrors checkout and the policy
 * pages, so a model quoting it can't promise anything the store doesn't do.
 */
export async function GET() {
  const [collections, zones] = await Promise.all([
    getTopLevelCategoriesWithCounts().catch(() => []),
    getActiveShippingZones(),
  ]);
  const range = feeRange(zones);
  const shippingLine = range
    ? `EGP ${range.min}–${range.max} depending on the area (e.g. Sohag ${zones.find((z) => z.code === "sohag")?.fee ?? range.min}, Cairo ${zones.find((z) => z.code === "cairo")?.fee ?? range.min})`
    : "priced by area at checkout";
  const phone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "+201229749608";

  const collectionLines = collections
    .filter((c) => c.productCount > 0)
    .map((c) => {
      const from = c.minPrice ? ` — from EGP ${Math.round(c.minPrice).toLocaleString("en-US")}` : "";
      return `- [${c.name_en} / ${c.name_ar}](${SITE_URL}/en/catalog/${c.slug}): ${c.productCount} products${from}`;
    })
    .join("\n");

  const body = `# M.M Bags (إم إم باجز)

> ${SITE_DESCRIPTION_EN}

## Key facts
- Egyptian bag store founded in 1998 in Tama, Sohag; run today by Marco Milad.
- Two physical branches in Tama, Sohag: Shohada Street and Al-Ozraa Street, open daily 11 AM – 10 PM.
- Online store ships to all 27 Egyptian governorates. Each order is confirmed with the customer (within 24 hours), then delivered ${DELIVERY_HOURS_MIN}–${DELIVERY_HOURS_MAX} hours after it is handed to the courier.
- Shipping: ${shippingLine}; free on orders from EGP ${FREE_SHIPPING_THRESHOLD.toLocaleString("en-US")}.
- Payment: cash on delivery (the courier's collection fee: EGP ${COD_FEE_BASE} up to EGP ${COD_FEE_BAND.toLocaleString("en-US")}, plus EGP ${COD_FEE_STEP} per further EGP ${COD_FEE_BAND.toLocaleString("en-US")}) or InstaPay transfer with no fee. No card payments or instalments.
- Returns: 14 days from delivery, unused with invoice; the customer pays return shipping (the same as the shipping price for their area) on a change of mind, the store pays for manufacturing defects.
- Warranty: one year against manufacturing defects (wheels, handles, zippers, shell).
- Contact: WhatsApp ${phone}. Instagram/Facebook/TikTok: @mmbags.eg.
- Website languages: Arabic (default) and English.

## Collections
${collectionLines || "- See the catalog."}

## Buying guides
${GUIDES.map((g) => `- [${g.title.en}](${SITE_URL}/en/guides/${g.slug}) · [العربية](${SITE_URL}/ar/guides/${g.slug}): ${g.summary.en}`).join("\n")}

## Useful pages
- [Catalog (Arabic)](${SITE_URL}/ar/catalog) · [Catalog (English)](${SITE_URL}/en/catalog)
- [FAQ](${SITE_URL}/en/faq): shipping, payment, returns, sizes, cabin-bag rules
- [Shipping policy](${SITE_URL}/en/shipping-policy)
- [Returns & warranty](${SITE_URL}/en/refund-policy)
- [About M.M Bags](${SITE_URL}/en/about)
- [Contact](${SITE_URL}/en/contact)
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
