"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  locale: z.enum(["ar", "en"]),
});

export type UpdateProfileResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Updates the signed-in user's display name (stored in
 * user_metadata.name). The Supabase auth client used here goes
 * through the SSR cookie flow, so the new metadata is read back on
 * the next request without an extra fetch.
 */
export async function updateProfile(
  _prev: UpdateProfileResult,
  formData: FormData,
): Promise<UpdateProfileResult> {
  const parsed = profileSchema.safeParse({
    name: formData.get("name") ?? "",
    locale: formData.get("locale") ?? "ar",
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  const { name, locale } = parsed.data;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({
    data: { name },
  });
  if (error) {
    return { ok: false, error: error.message };
  }
  revalidatePath(`/${locale}/account`);
  return { ok: true };
}

/** Sign-out form action — clears the session cookie + redirects home. */
export async function signOut(formData: FormData): Promise<void> {
  const locale = formData.get("locale") === "en" ? "en" : "ar";
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect(`/${locale}`);
}
