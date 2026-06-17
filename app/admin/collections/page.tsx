import Link from "next/link";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  deleteCollection,
  toggleCollectionActive,
} from "@/lib/admin/collections-actions";
import { getAdminLocale } from "@/lib/admin/locale";

export const dynamic = "force-dynamic";

export default async function AdminCollectionsPage() {
  const locale = await getAdminLocale();
  const isAr = locale === "ar";

  const admin = getSupabaseAdminClient();
  const { data: collections } = await admin
    .from("collections")
    .select("*")
    .order("parent_slug", { ascending: true, nullsFirst: true })
    .order("sort_order", { ascending: true });

  const list = collections ?? [];
  const topLevelCount = list.filter((c) => !c.parent_slug).length;

  return (
    <section>
      <header className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">
            {isAr ? "التشكيلات" : "Collections"}
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {isAr
              ? `${list.length} إجمالي · ${topLevelCount} رئيسية`
              : `${list.length} total · ${topLevelCount} top-level`}
          </p>
        </div>
        <Link
          href="/admin/collections/new"
          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-primary-light)]"
        >
          <Plus className="h-4 w-4" />
          {isAr ? "تشكيلة جديدة" : "New collection"}
        </Link>
      </header>

      <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-surface)] text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
            <tr>
              <th className="px-4 py-3 text-start">{isAr ? "الاسم" : "Name"}</th>
              <th className="px-4 py-3 text-start">{isAr ? "السلاج" : "Slug"}</th>
              <th className="px-4 py-3 text-start">{isAr ? "الأب" : "Parent"}</th>
              <th className="px-4 py-3 text-start">{isAr ? "الترتيب" : "Order"}</th>
              <th className="px-4 py-3 text-start">{isAr ? "الحالة" : "Status"}</th>
              <th className="px-4 py-3 text-end">{isAr ? "إجراءات" : "Actions"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {list.map((c) => {
              const toggle = toggleCollectionActive.bind(null, c.id, !c.is_active);
              const del = deleteCollection.bind(null, c.id);
              return (
                <tr key={c.id} className="hover:bg-[var(--color-surface)]/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-[var(--color-text)]">{c.name_en}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]" dir="rtl">
                      {c.name_ar}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <code className="rounded bg-[var(--color-surface)] px-1.5 py-0.5 text-xs">
                      {c.slug}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                    {c.parent_slug ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-[var(--color-text-secondary)]">
                    {c.sort_order}
                  </td>
                  <td className="px-4 py-3">
                    <form action={toggle}>
                      <button
                        type="submit"
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          c.is_active
                            ? "bg-[var(--color-success)]/15 text-[var(--color-success)]"
                            : "bg-[var(--color-surface)] text-[var(--color-text-secondary)]"
                        }`}
                      >
                        {c.is_active
                          ? isAr
                            ? "ظاهرة"
                            : "Active"
                          : isAr
                            ? "مخفية"
                            : "Hidden"}
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/collections/${c.id}/edit`}
                        aria-label={isAr ? "تعديل" : "Edit"}
                        className="rounded-full p-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Link>
                      <form action={del}>
                        <button
                          type="submit"
                          aria-label={isAr ? "حذف" : "Delete"}
                          className="rounded-full p-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-error)]"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
