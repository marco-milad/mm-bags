import { getTopLevelCategoriesWithCounts } from "@/lib/queries/categories";
import { SITE_DESCRIPTION_EN, SITE_URL } from "@/lib/seo/site";
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE, COD_FEE } from "@/lib/checkout/schema";

// Regenerated hourly: collections and their "from" prices come from the DB.
export const revalidate = 3600;

/**
 * /llms.txt — a plain-markdown fact sheet for AI answer engines
 * (https://llmstxt.org). Everything here mirrors checkout and the policy
 * pages, so a model quoting it can't promise anything the store doesn't do.
 */
export async function GET() {
  const collections = await getTopLevelCategoriesWithCounts().catch(() => []);
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
- Online store ships to all 27 Egyptian governorates in 2–5 business days.
- Shipping: EGP ${SHIPPING_FEE} flat; free on orders from EGP ${FREE_SHIPPING_THRESHOLD.toLocaleString("en-US")}.
- Payment: cash on delivery (EGP ${COD_FEE} fee) or InstaPay transfer. No card payments or instalments.
- Returns: 14 days from delivery, unused with invoice; the customer pays about EGP 50 return shipping on a change of mind, the store pays for manufacturing defects.
- Warranty: one year against manufacturing defects (wheels, handles, zippers, shell).
- Contact: WhatsApp ${phone}. Instagram/Facebook/TikTok: @mmbags.eg.
- Website languages: Arabic (default) and English.

## Collections
${collectionLines || "- See the catalog."}

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
