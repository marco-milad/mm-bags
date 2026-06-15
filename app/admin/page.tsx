import Link from "next/link";
import { ChevronRight, MessageSquareText } from "lucide-react";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Admin dashboard landing. Today it's mostly stubbed placeholders for
 * Phase 5 — except the Reviews tile, which fetches the live pending
 * count so the admin can spot a moderation backlog at a glance and
 * click straight into the queue.
 */
export default async function AdminDashboard() {
  const admin = getSupabaseAdminClient();
  const { count: pendingReviews } = await admin
    .from("reviews")
    .select("id", { count: "exact", head: true })
    .eq("is_approved", false);

  return (
    <section>
      <h1 className="font-display text-3xl">Dashboard</h1>
      <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
        Admin shell — fill in metrics, orders, and inventory in Phase 5.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {["Today's revenue", "New orders", "Low stock"].map((label) => (
          <div
            key={label}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
          >
            <p className="text-xs uppercase tracking-wider text-[var(--color-text-secondary)]">
              {label}
            </p>
            <p className="mt-2 font-mono text-2xl text-[var(--color-primary)]">—</p>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <h2 className="font-display text-xl">Moderation</h2>
        <ul className="mt-3 grid gap-3 md:grid-cols-2">
          <li>
            <Link
              href="/admin/reviews"
              className="group flex items-center gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 transition hover:border-[var(--color-accent)] hover:shadow-sm"
            >
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-brass-500/15 text-brass-700">
                <MessageSquareText className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <p className="font-semibold text-[var(--color-text)]">
                  Reviews
                </p>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Approve or reject pending submissions
                </p>
              </div>
              {/* Brass-tinted count badge — matches the queue page header. */}
              {pendingReviews !== null && pendingReviews > 0 && (
                <span className="inline-flex items-center rounded-full bg-brass-500/20 px-2.5 py-0.5 font-mono text-xs font-semibold text-brass-700">
                  {pendingReviews}
                </span>
              )}
              <ChevronRight className="h-4 w-4 text-[var(--color-text-secondary)] transition group-hover:translate-x-0.5" />
            </Link>
          </li>
        </ul>
      </div>
    </section>
  );
}
