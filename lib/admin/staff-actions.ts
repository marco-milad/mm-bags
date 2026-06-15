"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { StaffRole } from "@/lib/supabase/types";

const ROLES = ["cashier", "manager", "admin"] as const;

// ─── Create staff ────────────────────────────────────────────────────
const createSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email(),
  phone: z.string().trim().max(30).optional(),
  role: z.enum(ROLES),
});

export type CreateStaffResult =
  | { ok: true; tempPassword: string }
  | { ok: false; error: string };

/**
 * Create a Supabase auth user + a `staff` row in one go.
 *
 * Generates a 12-char alphanumeric temp password and returns it via
 * the result so the admin UI can display it once for the manager to
 * forward to the new staffer. We don't email it because the email
 * pipeline + branded template isn't a hard requirement for the MVP —
 * a manual one-time hand-off is acceptable for a small team.
 *
 * Edge cases:
 *   - Auth user already exists with that email → we surface the
 *     supabase-js error verbatim ("User already registered").
 *   - Staff row insert fails after the auth user was created → we
 *     delete the auth user to keep the system consistent.
 */
export async function createStaff(formData: FormData): Promise<CreateStaffResult> {
  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  const { name, email, phone, role } = parsed.data;
  const admin = getSupabaseAdminClient();

  const tempPassword = generateTempPassword();
  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { name, role },
  });
  if (authErr || !created.user) {
    return { ok: false, error: authErr?.message ?? "Auth user create failed" };
  }

  const { error: insertErr } = await admin.from("staff").insert({
    user_id: created.user.id,
    name,
    phone: phone || null,
    role,
    is_active: true,
  });
  if (insertErr) {
    // Roll back the auth user so the email isn't left orphaned.
    await admin.auth.admin.deleteUser(created.user.id);
    return { ok: false, error: insertErr.message };
  }

  revalidatePath("/admin/staff");
  return { ok: true, tempPassword };
}

// ─── Update role / active flag ───────────────────────────────────────
const updateSchema = z.object({
  id: z.uuid(),
  role: z.enum(ROLES).optional(),
  isActive: z.boolean().optional(),
});

export async function updateStaff(formData: FormData): Promise<void> {
  const parsed = updateSchema.safeParse({
    id: formData.get("id"),
    role: formData.get("role") || undefined,
    isActive:
      formData.get("isActive") === null
        ? undefined
        : formData.get("isActive") === "1",
  });
  if (!parsed.success) return;
  const admin = getSupabaseAdminClient();
  const patch: { role?: StaffRole; is_active?: boolean } = {};
  if (parsed.data.role) patch.role = parsed.data.role;
  if (typeof parsed.data.isActive === "boolean")
    patch.is_active = parsed.data.isActive;
  if (Object.keys(patch).length === 0) return;
  await admin.from("staff").update(patch).eq("id", parsed.data.id);
  revalidatePath("/admin/staff");
}

/**
 * Resolve the currently-signed-in user's staff role (or admin via the
 * pre-existing `ADMIN_EMAIL` / `user_metadata.role` mechanism). Used
 * by the layout to drive sidebar filtering.
 */
export async function getCurrentRole(): Promise<{
  role: StaffRole | "admin";
  source: "metadata" | "email" | "staff";
} | null> {
  const userClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return null;

  // user_metadata.role wins so the original admin pathway keeps
  // working even before the user has a staff record.
  const metaRole = (user.user_metadata as { role?: string } | null)?.role;
  if (metaRole === "admin") return { role: "admin", source: "metadata" };

  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail && user.email === adminEmail) {
    return { role: "admin", source: "email" };
  }

  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from("staff")
    .select("role, is_active")
    .eq("user_id", user.id)
    .maybeSingle();
  if (data && data.is_active) {
    return { role: data.role, source: "staff" };
  }
  return null;
}

// ─── temp password generator ─────────────────────────────────────────
function generateTempPassword(): string {
  // 12 chars from a URL-safe alphabet — strong enough as a one-time
  // hand-off password before the new staffer changes it themselves.
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 12; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}
