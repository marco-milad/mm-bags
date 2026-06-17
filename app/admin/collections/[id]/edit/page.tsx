import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { updateCollection } from "@/lib/admin/collections-actions";
import { CollectionForm } from "@/components/admin/CollectionForm";
import { getAdminLocale } from "@/lib/admin/locale";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditCollectionPage({
  params,
}: PageProps<"/admin/collections/[id]/edit">) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const locale = await getAdminLocale();
  const isAr = locale === "ar";

  const admin = getSupabaseAdminClient();
  const [{ data: collection }, { data: parents }] = await Promise.all([
    admin.from("collections").select("*").eq("id", id).maybeSingle(),
    admin
      .from("collections")
      .select("slug, name_en")
      .is("parent_slug", null)
      .neq("id", id) // can't be its own parent
      .order("sort_order", { ascending: true }),
  ]);

  if (!collection) notFound();

  const action = updateCollection.bind(null, id);

  return (
    <section className="max-w-3xl">
      <Link
        href="/admin/collections"
        className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
      >
        <ChevronLeft className="h-4 w-4" />
        {isAr ? "الرجوع للتشكيلات" : "Back to collections"}
      </Link>
      <h1 className="mb-1 font-display text-3xl">
        {isAr ? "تعديل التشكيلة" : "Edit collection"}
      </h1>
      <p className="mb-6 font-mono text-xs text-[var(--color-text-secondary)]">{collection.slug}</p>
      <CollectionForm
        action={action}
        initial={collection}
        parentOptions={parents ?? []}
        locale={locale}
      />
    </section>
  );
}
