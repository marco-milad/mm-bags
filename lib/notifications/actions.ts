"use server";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { backInStockSchema, type BackInStockInput } from "./schema";

export type SubscribeResult =
  | { ok: true; alreadySubscribed: boolean }
  | { ok: false; error: string };

export async function subscribeBackInStock(
  raw: BackInStockInput,
): Promise<SubscribeResult> {
  const parsed = backInStockSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };
  }
  const { productId, variantId, channel, email, phone } = parsed.data;

  // Capture user_id if logged in (currently nobody is — guest flow is the path).
  const userClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  const guestEmail = channel === "email" ? email! : null;
  const guestPhone = channel === "whatsapp" ? phone! : null;

  // RLS lets anyone INSERT but not SELECT, so the dup check must run with admin.
  const admin = getSupabaseAdminClient();

  // Idempotency: if the same contact+variant+channel already exists and hasn't
  // been notified yet, treat as success without inserting again.
  const dupQuery = admin
    .from("notification_subscriptions")
    .select("id")
    .eq("variant_id", variantId)
    .eq("channel", channel)
    .eq("notified", false)
    .limit(1);

  if (user) {
    dupQuery.eq("user_id", user.id);
  } else if (guestEmail) {
    dupQuery.eq("guest_email", guestEmail);
  } else if (guestPhone) {
    dupQuery.eq("guest_phone", guestPhone);
  }

  const { data: existing } = await dupQuery.maybeSingle();
  if (existing) {
    return { ok: true, alreadySubscribed: true };
  }

  const { error } = await admin.from("notification_subscriptions").insert({
    product_id: productId,
    variant_id: variantId,
    user_id: user?.id ?? null,
    guest_email: guestEmail,
    guest_phone: guestPhone,
    channel,
  });

  if (error) {
    return { ok: false, error: `حصلت مشكلة في الاشتراك: ${error.message}` };
  }

  return { ok: true, alreadySubscribed: false };
}
