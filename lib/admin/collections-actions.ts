"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const slugRe = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const collectionInputSchema = z.object({
  name_ar: z.string().trim().min(2),
  name_en: z.string().trim().min(2),
  slug: z.string().trim().regex(slugRe, {
    message: "slug must be lowercase kebab-case (letters, digits, hyphens)",
  }),
  description_ar: z.string().trim().optional().or(z.literal("")),
  description_en: z.string().trim().optional().or(z.literal("")),
  parent_slug: z.string().trim().optional().or(z.literal("")),
  sort_order: z.coerce.number().int().min(0).max(9999),
  cover_image: z.string().trim().optional().or(z.literal("")),
  is_active: z.coerce.boolean(),
});

function pick(formData: FormData) {
  return {
    name_ar: String(formData.get("name_ar") ?? ""),
    name_en: String(formData.get("name_en") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    description_ar: String(formData.get("description_ar") ?? ""),
    description_en: String(formData.get("description_en") ?? ""),
    parent_slug: String(formData.get("parent_slug") ?? ""),
    sort_order: String(formData.get("sort_order") ?? "0"),
    cover_image: String(formData.get("cover_image") ?? ""),
    is_active: formData.get("is_active") === "on" || formData.get("is_active") === "true",
  };
}

function revalidatePublic() {
  // Public surfaces that show collection lists / counts.
  revalidatePath("/ar");
  revalidatePath("/en");
  revalidatePath("/ar/categories");
  revalidatePath("/en/categories");
  revalidatePath("/ar/catalog");
  revalidatePath("/en/catalog");
  revalidatePath("/admin/collections");
}

export async function createCollection(formData: FormData) {
  const parsed = collectionInputSchema.safeParse(pick(formData));
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const data = parsed.data;
  const admin = getSupabaseAdminClient();
  const { error } = await admin.from("collections").insert({
    slug: data.slug,
    name_ar: data.name_ar,
    name_en: data.name_en,
    description_ar: data.description_ar || null,
    description_en: data.description_en || null,
    parent_slug: data.parent_slug || null,
    sort_order: data.sort_order,
    cover_image: data.cover_image || null,
    is_active: data.is_active,
  });
  if (error) throw new Error(error.message);
  revalidatePublic();
  redirect("/admin/collections");
}

export async function updateCollection(id: string, formData: FormData) {
  const parsed = collectionInputSchema.safeParse(pick(formData));
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }
  const data = parsed.data;
  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("collections")
    .update({
      slug: data.slug,
      name_ar: data.name_ar,
      name_en: data.name_en,
      description_ar: data.description_ar || null,
      description_en: data.description_en || null,
      parent_slug: data.parent_slug || null,
      sort_order: data.sort_order,
      cover_image: data.cover_image || null,
      is_active: data.is_active,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePublic();
  redirect("/admin/collections");
}

export async function toggleCollectionActive(id: string, nextActive: boolean) {
  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("collections")
    .update({ is_active: nextActive })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePublic();
}

export async function deleteCollection(id: string) {
  const admin = getSupabaseAdminClient();
  // Products' collection_id will be set to NULL via the ON DELETE SET NULL FK.
  const { error } = await admin.from("collections").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePublic();
}
