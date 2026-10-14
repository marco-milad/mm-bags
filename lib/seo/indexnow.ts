/**
 * IndexNow (https://www.indexnow.org): tell Bing (and the other IndexNow
 * engines) the moment a page changes instead of waiting for a re-crawl.
 * Bing's index also feeds ChatGPT search, so this is the fastest way for a
 * new product or a corrected price to reach answer engines.
 *
 * The key is public by design: it's served as /<key>.txt (public/) so the
 * engines can confirm we own the host. Pure helpers here; the network call
 * lives in indexnow-submit.ts.
 */
export const INDEXNOW_KEY = "982bd34cf276206982cb753940f98d49";
export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

/** IndexNow accepts up to 10,000 URLs per request, all on the same host. */
export function indexNowPayload(siteUrl: string, paths: ReadonlyArray<string>) {
  const base = new URL(siteUrl);
  const urlList = [
    ...new Set(
      paths.map((p) => (p.startsWith("http") ? p : new URL(p, base).toString())),
    ),
  ]
    .filter((u) => new URL(u).host === base.host)
    .slice(0, 10_000);
  return {
    host: base.host,
    key: INDEXNOW_KEY,
    keyLocation: new URL(`/${INDEXNOW_KEY}.txt`, base).toString(),
    urlList,
  };
}

/** Both locale URLs of a product page. */
export function productPaths(slug: string): string[] {
  return [`/ar/products/${slug}`, `/en/products/${slug}`];
}
