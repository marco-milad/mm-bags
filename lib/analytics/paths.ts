/**
 * Pure helpers for the path / reach / retention reports. No I/O — tested in
 * __tests__/paths.test.ts.
 */

/** Human label for a locale-less path from analytics_paths ("/products/x"). */
export function pageLabel(page: string, isAr: boolean): string {
  const p = page.split("?")[0].replace(/\/+$/, "") || "/";
  const t = (ar: string, en: string) => (isAr ? ar : en);
  if (p === "/") return t("الرئيسية", "Home");
  const [, first, rest] = p.match(/^\/([^/]+)(?:\/(.+))?$/) ?? [];
  const tail = rest ? decodeSafe(rest) : "";
  switch (first) {
    case "products":
      return tail ? `${t("منتج", "Product")}: ${tail}` : t("المنتجات", "Products");
    case "catalog":
      return tail ? `${t("مجموعة", "Collection")}: ${tail}` : t("كل المنتجات", "Catalog");
    case "categories":
      return t("التشكيلات", "Categories");
    case "guides":
      return tail ? `${t("دليل", "Guide")}: ${tail}` : t("أدلة الشراء", "Buying guides");
    case "cart":
      return t("السلة", "Cart");
    case "checkout":
      return t("الدفع", "Checkout");
    case "order-confirmation":
      return t("تأكيد الطلب", "Order confirmed");
    case "track":
      return t("تتبع الطلب", "Order tracking");
    case "o":
      return t("لينك الطلب", "Order link");
    case "account":
      return tail === "wishlist" ? t("المفضلة", "Wishlist") : t("حسابي", "Account");
    case "auth":
      return t("تسجيل الدخول", "Sign in");
    case "faq":
      return t("الأسئلة الشائعة", "FAQ");
    case "about":
      return t("عن M.M Bags", "About");
    case "contact":
      return t("تواصل معنا", "Contact");
    default:
      return p;
  }
}

function decodeSafe(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/** Share in % (one decimal), or null when there's nothing to divide by. */
export function pct(part: number, whole: number): number | null {
  if (!(whole > 0)) return null;
  return Math.round((part / whole) * 1000) / 10;
}

/** Of the visitors who answered the banner, the % who accepted. */
export function consentRate(accepted: number, rejected: number): number | null {
  return pct(accepted, accepted + rejected);
}
