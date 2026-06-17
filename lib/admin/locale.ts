import "server-only";
import { cookies } from "next/headers";

/**
 * Admin-shell locale.
 *
 * The admin is NOT routed under `/[locale]` like the public storefront —
 * it lives at `/admin/*` and the language is a per-user preference
 * stored in a cookie. Default is Arabic; the EN/AR switcher in the
 * sidebar flips the cookie and refreshes so the server-rendered shell
 * picks up the new value on the next render.
 *
 * Client components that need the current locale receive it as a prop
 * from the surrounding server page (or from the AdminSidebar, which
 * gets it from the layout). No React Context is used so server pages
 * stay server-pure.
 */
export type AdminLocale = "ar" | "en";

export const ADMIN_LOCALE_COOKIE = "admin_locale";

/** Read the active admin locale from the cookie store. Defaults to AR. */
export async function getAdminLocale(): Promise<AdminLocale> {
  const store = await cookies();
  const raw = store.get(ADMIN_LOCALE_COOKIE)?.value;
  return raw === "en" ? "en" : "ar";
}

export function isAdminRTL(locale: AdminLocale): boolean {
  return locale === "ar";
}
