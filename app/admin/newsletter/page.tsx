import Link from "next/link";
import { Download } from "lucide-react";
import {
  getNewsletterStats,
  listNewsletterSubscribers,
  type NewsletterFilters,
} from "@/lib/queries/admin-newsletter";
import { toggleSubscriberActive } from "@/lib/admin/newsletter-actions";
import { BroadcastForm } from "@/components/admin/newsletter/BroadcastForm";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * /admin/newsletter — subscribers + broadcast.
 *
 * Sections:
 *   - 4 stat cards: total / active / AR / EN.
 *   - Broadcast form (AR + EN with preview).
 *   - Filter form (search + status + locale).
 *   - Subscribers table with per-row active toggle.
 *   - CSV export link honoring the active filter set.
 */
export default async function NewsletterPage({
  searchParams,
}: PageProps<"/admin/newsletter">) {
  const sp = await searchParams;
  const filters: NewsletterFilters = {
    q: typeof sp?.q === "string" ? sp.q : undefined,
    status:
      sp?.status === "active" || sp?.status === "inactive"
        ? (sp.status as "active" | "inactive")
        : undefined,
    locale:
      sp?.locale === "ar" || sp?.locale === "en"
        ? (sp.locale as "ar" | "en")
        : undefined,
  };

  const [subscribers, stats] = await Promise.all([
    listNewsletterSubscribers(filters),
    getNewsletterStats(),
  ]);

  const exportParams = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (typeof v === "string" && v) exportParams.set(k, v);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-[var(--color-text)]">
            Newsletter · النشرة البريدية
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Manage subscribers and send broadcast emails via Resend.
          </p>
        </div>
        <a
          href={`/admin/newsletter/export?${exportParams.toString()}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-4 py-2 text-xs font-semibold text-[var(--color-text)] transition hover:border-[var(--color-accent)]"
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </a>
      </header>

      {/* Stats */}
      <section className="grid gap-3 md:grid-cols-4">
        <Stat label="Total" value={String(stats.total)} />
        <Stat label="Active" value={String(stats.active)} tone="primary" />
        <Stat label="Arabic" value={String(stats.ar)} />
        <Stat label="English" value={String(stats.en)} />
      </section>

      {/* Broadcast form */}
      <BroadcastForm activeCount={stats.active} />

      {/* Filters */}
      <form
        action="/admin/newsletter"
        className="flex flex-wrap items-end gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-3"
      >
        <label className="text-xs">
          <span className="mb-1 block uppercase tracking-wider text-[var(--color-text-secondary)]">
            Search email
          </span>
          <input
            type="search"
            name="q"
            defaultValue={filters.q ?? ""}
            placeholder="example@..."
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none"
          />
        </label>
        <label className="text-xs">
          <span className="mb-1 block uppercase tracking-wider text-[var(--color-text-secondary)]">
            Status
          </span>
          <select
            name="status"
            defaultValue={filters.status ?? ""}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
          >
            <option value="">Any</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        <label className="text-xs">
          <span className="mb-1 block uppercase tracking-wider text-[var(--color-text-secondary)]">
            Locale
          </span>
          <select
            name="locale"
            defaultValue={filters.locale ?? ""}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
          >
            <option value="">Any</option>
            <option value="ar">Arabic</option>
            <option value="en">English</option>
          </select>
        </label>
        <button
          type="submit"
          className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white"
        >
          Apply
        </button>
        <Link
          href="/admin/newsletter"
          className="text-xs text-[var(--color-text-secondary)] underline-offset-4 hover:underline"
        >
          Reset
        </Link>
      </form>

      <p className="text-xs text-[var(--color-text-secondary)]">
        {subscribers.length} subscriber{subscribers.length === 1 ? "" : "s"}
      </p>

      <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
        <table className="w-full min-w-[680px] text-sm">
          <thead className="bg-[var(--color-surface)] text-[var(--color-text-secondary)]">
            <tr>
              <Th>Email</Th>
              <Th>Locale</Th>
              <Th>Subscribed</Th>
              <Th>Status</Th>
              <Th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {subscribers.map((s) => (
              <tr
                key={s.id}
                className="border-t border-[var(--color-border)] hover:bg-[var(--color-surface)]/50"
              >
                <td className="px-3 py-2 font-mono text-[12px] text-[var(--color-text)]" dir="ltr">
                  {s.email}
                </td>
                <td className="px-3 py-2 text-[12px] uppercase tracking-wider text-[var(--color-text-secondary)]">
                  {s.locale}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-[11px] text-[var(--color-text-secondary)]">
                  {new Date(s.subscribed_at).toLocaleDateString("en-US", {
                    dateStyle: "medium",
                  })}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
                      s.is_active
                        ? "bg-[var(--color-success)]/15 text-[var(--color-success)]"
                        : "bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]",
                    )}
                  >
                    {s.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-3 py-2 text-end">
                  <form action={toggleSubscriberActive}>
                    <input type="hidden" name="id" value={s.id} />
                    <button
                      type="submit"
                      className="text-xs text-[var(--color-text-secondary)] underline-offset-4 hover:text-[var(--color-text)] hover:underline"
                    >
                      {s.is_active ? "Deactivate" : "Reactivate"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {subscribers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-xs text-[var(--color-text-secondary)]">
                  No subscribers match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "primary";
}) {
  const color =
    tone === "primary"
      ? "text-[var(--color-primary)]"
      : "text-[var(--color-text)]";
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4">
      <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-secondary)]">
        {label}
      </p>
      <p className={`mt-1 font-mono text-2xl font-semibold ${color}`}>
        {value}
      </p>
    </div>
  );
}

function Th({
  children,
  className,
  ...rest
}: {
  children?: React.ReactNode;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <th
      scope="col"
      className={
        "px-3 py-2 text-start text-[11px] font-semibold uppercase tracking-wider " +
        (className ?? "")
      }
      {...rest}
    >
      {children}
    </th>
  );
}
