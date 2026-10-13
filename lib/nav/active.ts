/**
 * Which mobile bottom-nav tab the current path belongs to. Pure so the
 * matching rules are unit-tested (lib/nav/__tests__/active.test.ts) instead
 * of living inside the client component.
 *
 * Rules (segment-aware: `/catalogue` never matches `/catalog`):
 *  - home      → exactly `/{locale}`; every page is "under" home, so a
 *                prefix match would light it up everywhere.
 *  - wishlist  → `/{locale}/account/wishlist` and below. Tested before
 *                account, because it lives inside /account.
 *  - account   → `/{locale}/account` and its other sub-pages.
 *  - catalog   → `/{locale}/catalog/*`, plus `/products/*` and
 *                `/categories`: a product page or the category index is still
 *                "browsing the shop", and the shopper reached it through the
 *                Products tab. Leaving them unmarked would make the bar look
 *                broken on the pages people spend the most time on.
 *  - anything else (cart, checkout, auth, policies…) → null, no tab marked.
 */

export type BottomNavTab = "home" | "catalog" | "wishlist" | "account";

function under(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

export function activeBottomNavTab(
  pathname: string | null | undefined,
  locale: string,
): BottomNavTab | null {
  if (!pathname) return null;
  // usePathname() has no query/hash, but be defensive; drop a trailing slash.
  let path = pathname.split(/[?#]/)[0];
  if (path.length > 1 && path.endsWith("/")) path = path.replace(/\/+$/, "");

  const base = `/${locale}`;
  if (path === base) return "home";
  if (under(path, `${base}/account/wishlist`)) return "wishlist";
  if (under(path, `${base}/account`)) return "account";
  if (
    under(path, `${base}/catalog`) ||
    under(path, `${base}/products`) ||
    under(path, `${base}/categories`)
  ) {
    return "catalog";
  }
  return null;
}
