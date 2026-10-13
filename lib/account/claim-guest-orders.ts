import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { claimableEmail, escapeIlike, type ClaimUser } from "@/lib/account/claim-rules";

/**
 * Moves guest orders placed with this account's (confirmed) email into the
 * account, so a shopper who checked out as a guest and signed up later sees
 * those orders under "My account" on any device.
 *
 * Safe to call on every account-page load: it only touches rows that are
 * still unowned (user_id is null), so it is idempotent and can never move an
 * order away from another account. Returns how many orders were attached;
 * never throws — a failure just means the orders show up next time.
 */
export async function claimGuestOrders(
  user: ClaimUser & { id: string },
): Promise<number> {
  const email = claimableEmail(user);
  if (!email) return 0;

  try {
    const { data, error } = await getSupabaseAdminClient()
      .from("orders")
      .update({ user_id: user.id })
      .is("user_id", null)
      .ilike("guest_email", escapeIlike(email))
      .select("id");
    if (error) {
      console.warn("[account] claimGuestOrders failed", error.message);
      return 0;
    }
    return data?.length ?? 0;
  } catch (e) {
    console.warn("[account] claimGuestOrders failed", e);
    return 0;
  }
}
