import { Database, ExternalLink, HardDrive, Users } from "lucide-react";
import {
  FREE_PLAN_LIMITS,
  formatBytes,
  type SupabaseUsage,
} from "@/lib/queries/admin-usage";
import type { AdminLocale } from "@/lib/admin/locale";
import { cn } from "@/lib/utils";

/**
 * Compact "system health" widget for the admin dashboard.
 *
 * Surfaces Supabase Free-Plan headroom so Marco notices a creeping
 * storage / row-count problem long before it hits the cap. Three
 * blocks:
 *   1. Storage progress bar + per-bucket breakdown
 *   2. Top tables by row count (proxy for DB-size pressure since the
 *      real `pg_database_size` isn't queryable without an RPC)
 *   3. Auth user count + link to the Supabase dashboard for the
 *      metrics we genuinely can't see from inside (bandwidth, MAU).
 *
 * Colour rules — green / amber / red kick in at 60 / 80 / 95 percent
 * of the published cap.
 */
export function SupabaseUsageCard({
  usage,
  locale,
  supabaseProjectRef,
}: {
  usage: SupabaseUsage;
  locale: AdminLocale;
  /** Used to build the deep link to the Supabase dashboard usage page.
      Pass `process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF` from the
      server component. */
  supabaseProjectRef?: string;
}) {
  const isAr = locale === "ar";
  const storagePct = usage.storage.pctOfLimit;
  const storageTone = toneFromPct(storagePct);

  const dashboardUrl = supabaseProjectRef
    ? `https://supabase.com/dashboard/project/${supabaseProjectRef}/settings/billing/usage`
    : "https://supabase.com/dashboard";

  return (
    <section
      aria-label={isAr ? "استهلاك Supabase" : "Supabase usage"}
      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5"
    >
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-lg text-[var(--color-text)]">
          {isAr ? "استهلاك السيرفر (Supabase Free)" : "Supabase usage (Free plan)"}
        </h2>
        <a
          href={dashboardUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] text-[var(--color-text-secondary)] underline-offset-2 hover:text-[var(--color-text)] hover:underline"
        >
          {isAr ? "افتح Supabase Dashboard" : "Open Supabase dashboard"}
          <ExternalLink className="h-3 w-3" />
        </a>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {/* ── Block 1: Storage ────────────────────────────────────── */}
        <div className="space-y-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              <HardDrive className="h-3.5 w-3.5" />
              <span>{isAr ? "الصور والتخزين" : "Storage"}</span>
            </div>
            <span
              className={cn(
                "font-mono text-[11px] font-semibold",
                toneTextClass(storageTone),
              )}
            >
              {storagePct.toFixed(1)}%
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={Math.min(100, Math.round(storagePct))}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={isAr ? "استهلاك التخزين" : "Storage usage"}
            className="h-2 overflow-hidden rounded-full bg-[var(--color-border)]"
          >
            <div
              className={cn("h-full transition-[width]", toneBgClass(storageTone))}
              style={{ width: `${Math.min(100, storagePct)}%` }}
            />
          </div>
          <p className="font-mono text-[11px] text-[var(--color-text-secondary)]">
            {formatBytes(usage.storage.totalBytes)} /{" "}
            {formatBytes(FREE_PLAN_LIMITS.storageBytes)}
          </p>

          {usage.storage.buckets.length > 0 && (
            <ul className="space-y-1 pt-1 text-[11px]">
              {usage.storage.buckets.map((b) => (
                <li
                  key={b.bucket}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="truncate text-[var(--color-text-secondary)]">
                    {b.bucket}{" "}
                    <span className="font-mono">({b.fileCount})</span>
                  </span>
                  <span className="font-mono text-[var(--color-text)]">
                    {formatBytes(b.bytes)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── Block 2: Tables ─────────────────────────────────────── */}
        <div className="space-y-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
            <Database className="h-3.5 w-3.5" />
            <span>{isAr ? "أكبر الجداول (صفوف)" : "Top tables (rows)"}</span>
          </div>
          <ul className="space-y-1 text-[11px]">
            {usage.tables.slice(0, 6).map((t) => (
              <li
                key={t.name}
                className="flex items-center justify-between gap-2"
              >
                <span className="truncate font-mono text-[var(--color-text-secondary)]">
                  {t.name}
                </span>
                <span className="font-mono text-[var(--color-text)]">
                  {t.rows.toLocaleString(isAr ? "ar-EG" : "en-US")}
                </span>
              </li>
            ))}
          </ul>
          <p className="border-t border-[var(--color-border)] pt-2 text-[10px] text-[var(--color-text-secondary)]">
            {isAr
              ? "حد قاعدة البيانات: 500 ميجا. شوف الدشبورد للأرقام الفعلية."
              : "DB cap: 500 MB. See dashboard for exact usage."}
          </p>
        </div>

        {/* ── Block 3: Auth + Links ───────────────────────────────── */}
        <div className="space-y-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
            <Users className="h-3.5 w-3.5" />
            <span>
              {isAr
                ? "المستخدمين المسجلين / الـ Bandwidth"
                : "Auth users / Bandwidth"}
            </span>
          </div>
          <p className="font-mono text-2xl font-semibold text-[var(--color-text)]">
            {usage.authUsers === null
              ? "—"
              : usage.authUsers.toLocaleString(isAr ? "ar-EG" : "en-US")}
            <span className="ms-2 text-[10px] font-normal text-[var(--color-text-secondary)]">
              / 50K
            </span>
          </p>
          <p className="text-[11px] text-[var(--color-text-secondary)]">
            {isAr
              ? "الـ Bandwidth الشهري (حد 5 GB) مش بيتقاس من هنا. شوفه في الدشبورد."
              : "Monthly bandwidth (5 GB cap) isn't measurable here. Check the dashboard."}
          </p>
          <a
            href={dashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--color-primary)] underline-offset-2 hover:underline"
          >
            {isAr ? "افتح صفحة الاستهلاك" : "Open usage page"}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </section>
  );
}

type Tone = "ok" | "warn" | "danger" | "critical";

function toneFromPct(pct: number): Tone {
  if (pct >= 95) return "critical";
  if (pct >= 80) return "danger";
  if (pct >= 60) return "warn";
  return "ok";
}

function toneTextClass(tone: Tone): string {
  switch (tone) {
    case "critical":
      return "text-[var(--color-error)]";
    case "danger":
      return "text-[var(--color-error)]";
    case "warn":
      return "text-[var(--color-warning)]";
    default:
      return "text-[var(--color-success)]";
  }
}

function toneBgClass(tone: Tone): string {
  switch (tone) {
    case "critical":
      return "bg-[var(--color-error)]";
    case "danger":
      return "bg-[var(--color-error)]/85";
    case "warn":
      return "bg-[var(--color-warning)]";
    default:
      return "bg-[var(--color-success)]";
  }
}
