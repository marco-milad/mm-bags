"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ADMIN_LOCALE_COOKIE, type AdminLocale } from "./locale";

/**
 * Switch the admin shell's display language. Called by the AR/EN
 * toggle in the sidebar — sets a long-lived cookie and revalidates
 * the admin tree so server-rendered labels re-resolve immediately.
 */
export async function setAdminLocale(formData: FormData): Promise<void> {
  const rawLocale = formData.get("locale");
  const locale: AdminLocale = rawLocale === "en" ? "en" : "ar";
  const store = await cookies();
  store.set(ADMIN_LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: false,
  });
  revalidatePath("/admin", "layout");
}
