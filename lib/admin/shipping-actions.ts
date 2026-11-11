"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/auth";
import { GOVERNORATE_CODES } from "@/lib/checkout/governorates";

/** Shipping prices change what every shopper pays → owner-level only. */
const ROLES = ["admin"] as const;

function refresh() {
  revalidatePath("/admin/shipping");
  revalidatePath("/[locale]/checkout", "page");
  revalidatePath("/[locale]/shipping-policy", "page");
}

const feeSchema = z.coerce.number().min(0).max(5000);

/** Save one area's price and on/off switch. Saving also clears
 *  "needs review" — the owner has looked at the price. */
export async function updateShippingZone(formData: FormData): Promise<void> {
  await requireAdmin([...ROLES]);
  const parsed = z
    .object({ id: z.uuid(), fee: feeSchema, active: z.boolean() })
    .safeParse({
      id: formData.get("id"),
      fee: formData.get("fee"),
      active: formData.get("active") === "on",
    });
  if (!parsed.success) return;
  const { id, fee, active } = parsed.data;
  await getSupabaseAdminClient()
    .from("shipping_zones")
    .update({
      fee,
      is_active: active,
      needs_review: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  refresh();
}

/** Add an area inside a governorate (e.g. a town the courier prices apart). */
export async function addShippingZone(formData: FormData): Promise<void> {
  await requireAdmin([...ROLES]);
  const parsed = z
    .object({
      governorate: z.enum(GOVERNORATE_CODES as [string, ...string[]]),
      nameAr: z.string().trim().min(2).max(120),
      nameEn: z.string().trim().max(120).optional(),
      fee: feeSchema,
    })
    .safeParse({
      governorate: formData.get("governorate"),
      nameAr: formData.get("nameAr"),
      nameEn: formData.get("nameEn") || undefined,
      fee: formData.get("fee"),
    });
  if (!parsed.success) return;
  const { governorate, nameAr, nameEn, fee } = parsed.data;
  const admin = getSupabaseAdminClient();
  const { count } = await admin
    .from("shipping_zones")
    .select("id", { count: "exact", head: true })
    .eq("governorate_code", governorate);
  await admin.from("shipping_zones").insert({
    code: `${governorate}-${Date.now().toString(36)}`,
    governorate_code: governorate,
    name_ar: nameAr,
    name_en: nameEn || nameAr,
    fee,
    sort_order: count ?? 0,
  });
  refresh();
}
