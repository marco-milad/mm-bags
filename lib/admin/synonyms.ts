"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/auth";
import { normalizeSearchTerm } from "@/lib/analytics/text";

/**
 * Search synonyms.
 *
 * The workflow this exists for: a term shows up in "searched, found nothing",
 * the owner recognises what the shopper meant, and maps it to language the
 * catalogue actually uses. For a catalogue this size that loop is the highest
 * value output in the whole analytics project — a stocked product that nobody
 * can find is worse than one that is out of stock.
 *
 * Both sides are normalized on the way in, so a synonym added as "شنطه" also
 * catches "شنطة".
 */

export type SynonymRow = { id: string; term: string; maps_to: string; created_at: string };
export type SynonymResult = { ok: true } | { ok: false; error: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated types
// predate migration 0017 (search_synonyms).
const table = () => getSupabaseAdminClient().from("search_synonyms" as any) as any;

export async function listSynonyms(): Promise<SynonymRow[]> {
  await requireAdmin();
  const { data, error } = await table().select("*").order("created_at", { ascending: false });
  if (error) throw new Error(`listSynonyms failed: ${error.message}`);
  return (data ?? []) as SynonymRow[];
}

export async function addSynonym(formData: FormData): Promise<SynonymResult> {
  await requireAdmin(["admin", "manager"]);

  const term = normalizeSearchTerm(String(formData.get("term") ?? ""));
  const mapsTo = normalizeSearchTerm(String(formData.get("maps_to") ?? ""));
  if (!term || !mapsTo) return { ok: false, error: "Both fields are required" };
  if (term === mapsTo) return { ok: false, error: "A term cannot map to itself" };

  const { error } = await table().insert({ term, maps_to: mapsTo });
  if (error) {
    // 23505 = the unique index on `term`.
    if (error.code === "23505") return { ok: false, error: "That term already has a mapping" };
    return { ok: false, error: error.message };
  }
  revalidatePath("/admin/analytics");
  return { ok: true };
}

export async function deleteSynonym(formData: FormData): Promise<void> {
  await requireAdmin(["admin", "manager"]);
  const id = formData.get("id");
  if (typeof id !== "string") return;
  await table().delete().eq("id", id);
  revalidatePath("/admin/analytics");
}
