import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import { findOrphanProductFiles } from "@/lib/queries/admin-cleanup";
import { formatCleanupBytes } from "@/lib/queries/admin-cleanup-shared";
import { getAdminLocale } from "@/lib/admin/locale";
import { OrphanFilesTable } from "@/components/admin/cleanup/OrphanFilesTable";

export const dynamic = "force-dynamic";

/**
 * /admin/cleanup — finds orphan files in the products bucket and
 * lets the admin delete them in bulk. Scoped to admin-only via the
 * cleanup-actions guard; the rest of the layout already filters
 * managers/cashiers out of the nav.
 */
export default async function CleanupPage() {
  const locale = await getAdminLocale();
  const isAr = locale === "ar";

  const scan = await findOrphanProductFiles();

  return (
    <div className="space-y-6">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
      >
        <ArrowLeft className="h-3 w-3" />
        {isAr ? "الرجوع للوحة التحكم" : "Back to dashboard"}
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-[var(--color-text)]">
            {isAr ? "تنظيف المخزن" : "Storage cleanup"}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {isAr
              ? "الملفات الموجودة في bucket المنتجات لكن مش مربوطة بأي منتج. حذفهم بيوفّر مساحة من حد الـ Supabase Free."
              : "Files in the products bucket no product references. Deleting them frees space against the Supabase Free cap."}
          </p>
        </div>
      </header>

      {/* Summary tiles */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label={isAr ? "إجمالي الملفات في الـ bucket" : "Total files in bucket"}
          value={scan.totals.storageObjectCount.toLocaleString(
            isAr ? "ar-EG" : "en-US",
          )}
          sub={formatCleanupBytes(scan.totals.storageBytes)}
        />
        <Stat
          label={isAr ? "مربوط بمنتجات" : "Referenced by products"}
          value={scan.totals.referencedCount.toLocaleString(
            isAr ? "ar-EG" : "en-US",
          )}
        />
        <Stat
          label={isAr ? "يتيم (قابل للحذف)" : "Orphans"}
          value={scan.totals.orphanCount.toLocaleString(
            isAr ? "ar-EG" : "en-US",
          )}
          sub={formatCleanupBytes(scan.totals.orphanBytes)}
          tone={scan.totals.orphanCount > 0 ? "warn" : "ok"}
        />
        <Stat
          label={isAr ? "حديث (متخطّى)" : "Recent (skipped)"}
          value={scan.totals.recentSkippedCount.toLocaleString(
            isAr ? "ar-EG" : "en-US",
          )}
          sub={
            isAr
              ? "آخر ساعة — مش بيتحذف"
              : "Last hour — auto-skipped"
          }
        />
      </section>

      {/* Safety note */}
      <div className="flex items-start gap-2 rounded-md border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 px-4 py-3 text-xs text-[var(--color-warning)]">
        <Trash2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p className="leading-relaxed">
          {isAr
            ? "الحذف نهائي ومش بيرجع. الملف بيتحذف فعلًا من Supabase Storage. الـ scanner بيتجاهل الملفات اللي اترفعت خلال آخر ساعة عشان منمسحش حاجة العميل في النص يحفظها."
            : "Deletion is permanent. Files removed from Supabase Storage cannot be recovered. The scanner skips files uploaded in the last hour so a mid-edit upload can't be wiped."}
        </p>
      </div>

      <OrphanFilesTable orphans={scan.orphans} isAr={isAr} />
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "ok" | "warn";
}) {
  const color =
    tone === "warn"
      ? "text-[var(--color-warning)]"
      : "text-[var(--color-text)]";
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
      <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-secondary)]">
        {label}
      </p>
      <p className={`mt-1 font-mono text-2xl font-semibold ${color}`}>
        {value}
      </p>
      {sub && (
        <p className="mt-0.5 text-[11px] text-[var(--color-text-secondary)]">
          {sub}
        </p>
      )}
    </div>
  );
}
