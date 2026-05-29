import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { createCollection } from "@/lib/admin/collections-actions";
import { CollectionForm } from "@/components/admin/CollectionForm";

export const dynamic = "force-dynamic";

export default async function NewCollectionPage() {
  const admin = getSupabaseAdminClient();
  const { data: parents } = await admin
    .from("collections")
    .select("slug, name_en")
    .is("parent_slug", null)
    .order("sort_order", { ascending: true });

  return (
    <section className="max-w-3xl">
      <Link
        href="/admin/collections"
        className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to collections
      </Link>
      <h1 className="mb-6 font-display text-3xl">New collection</h1>
      <CollectionForm action={createCollection} parentOptions={parents ?? []} />
    </section>
  );
}
