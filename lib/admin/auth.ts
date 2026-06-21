import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { StaffRole } from "@/lib/supabase/types";

export type EffectiveRole = StaffRole | "admin";

/**
 * Shared auth helper for admin server actions and API routes.
 *
 * Server Actions in Next.js are POST endpoints addressable by their
 * stable action ID — they are NOT auto-gated by the page's layout.
 * Without an explicit check, any authenticated (or even unauth'd)
 * user could invoke them. Every admin-side mutation MUST call this
 * helper at the top.
 *
 * Resolution order matches lib/admin/staff-actions.getCurrentRole():
 *   1. user.email === ADMIN_EMAIL (bootstrap escape hatch for the
 *      very first admin login on a fresh environment)
 *   2. active staff row with one of the requested roles
 *
 * NOTE: `user_metadata.role` is intentionally NOT consulted. That
 * field is writable by the end user via `supabase.auth.updateUser`
 * (it sits under the caller's JWT with no server-side check), so any
 * authenticated customer could otherwise self-elevate to admin by
 * pasting one line in DevTools. The staff table is the single source
 * of truth.
 *
 * Returns the resolved role on success; throws on failure so the
 * caller can let it bubble (Next.js shows the standard error). If
 * `allowed` is omitted we default to {admin, manager} — the catalog
 * surface that cashiers should never reach.
 */
export async function requireAdmin(
  allowed: ReadonlyArray<EffectiveRole> = ["admin", "manager"],
): Promise<EffectiveRole> {
  const userClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) throw new Error("UNAUTHORIZED");

  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail && user.email === adminEmail && allowed.includes("admin")) {
    return "admin";
  }

  const admin = getSupabaseAdminClient();
  const { data: staff } = await admin
    .from("staff")
    .select("role, is_active")
    .eq("user_id", user.id)
    .maybeSingle();
  if (
    staff &&
    staff.is_active &&
    allowed.includes(staff.role as EffectiveRole)
  ) {
    return staff.role as EffectiveRole;
  }
  throw new Error("FORBIDDEN");
}
