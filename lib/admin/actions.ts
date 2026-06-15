"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Sign the current admin out via Supabase auth and bounce back to the
 * marketing site. We can't use a server action that returns from a
 * client form here because `auth.signOut()` flips a cookie, and the
 * cookie write only sticks when paired with a redirect inside the
 * action.
 */
export async function adminSignOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/ar");
}
