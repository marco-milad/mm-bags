import Link from "next/link";
import { Send, Sparkles } from "lucide-react";
import {
  getWaitlistStats,
  listWaitlistGroups,
  listWaitlistProducts,
  type WaitlistFilters,
} from "@/lib/queries/admin-notifications";
import {
  sendAllPendingNotifications,
  sendVariantNotificationsForm,
} from "@/lib/admin/notification-actions";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * /admin/notifications — back-in-stock waitlist.
 *
 * Groups every notification_subscriptions row by variant. Each group
 * shows the product, variant label, current stock, pending count,
 * and a "Send notifications" button that batches Resend/Twilio
 * dispatches for all pending subscribers of that variant.
 *
 * Bulk send button at the top fires the same dispatch for every
 * variant that currently has pending rows.
 */
export default async function NotificationsPage({
  searchParams,
}: PageProps<"/admin/notifications">) {
  const sp = await searchParams;
  const filters: WaitlistFilters = {
    status: sp?.status === "all" ? "all" : "pending",
    productId:
      typeof sp?.product === "string" ? sp.product : undefined,
  };

  const [groups, stats, products] = await Promise.all([
    listWaitlistGroups(filters),
    getWaitlistStats(),
    listWaitlistProducts(),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-[var(--color-text)]">
            Back-in-stock · الإشعارات
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Customers waiting for restocks. Sending fires Resend email or
            Twilio WhatsApp depending on the channel they signed up with.
          </p>
        </div>
        {stats.pendingTotal > 0 && (
          <form action={sendAllPendingNotifications}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-full bg-brass-500 px-4 py-2 text-sm font-semibold text-navy-900 transition hover:bg-brass-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            >
              <Sparkles className="h-4 w-4" />
              Send all pending ({stats.pendingTotal})
            </button>
          </form>
        )}
      </header>

      {/* Stats */}
      <section className="grid gap-3 md:grid-cols-3">
        <Stat label="Pending notifications" value={String(stats.pendingTotal)} tone={stats.pendingTotal > 0 ? "warn" : "muted"} />
        <Stat label="Products with waitlist" value={String(stats.productsWithPending)} />
        <Stat label="Variants in queue" value={String(groups.length)} />
      </section>

      {/* Filters */}
      <form
        action="/admin/notifications"
        className="flex flex-wrap items-end gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-3"
      >
        <label className="text-xs">
          <span className="mb-1 block uppercase tracking-wider text-[var(--color-text-secondary)]">
            Status
          </span>
          <select
            name="status"
            defaultValue={filters.status ?? "pending"}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
          >
            <option value="pending">Pending only</option>
            <option value="all">All</option>
          </select>
        </label>
        <label className="text-xs">
          <span className="mb-1 block uppercase tracking-wider text-[var(--color-text-secondary)]">
            Product
          </span>
          <select
            name="product"
            defaultValue={filters.productId ?? ""}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
          >
            <option value="">All products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.pendingCount})
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white"
        >
          Apply
        </button>
        <Link
          href="/admin/notifications"
          className="text-xs text-[var(--color-text-secondary)] underline-offset-4 hover:underline"
        >
          Reset
        </Link>
      </form>

      {/* Groups */}
      {groups.length === 0 ? (
        <p className="rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-10 text-center text-xs text-[var(--color-text-secondary)]">
          No waitlist entries match the current filters.
        </p>
      ) : (
        <ul className="space-y-3">
          {groups.map((g) => {
            const backInStock = g.stockQty > 0;
            return (
              <li
                key={g.variantId}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5"
              >
                <header className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <Link
                      href={`/ar/products/${g.productSlug}`}
                      target="_blank"
                      className="font-display text-lg text-[var(--color-text)] hover:underline"
                    >
                      {g.productName}
                    </Link>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                      {g.colorHex && (
                        <span
                          aria-hidden
                          className="h-3 w-3 rounded-full ring-1 ring-[var(--color-border)]"
                          style={{ background: g.colorHex }}
                        />
                      )}
                      <span>{g.variantLabel}</span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
                          backInStock
                            ? "bg-[var(--color-success)]/15 text-[var(--color-success)]"
                            : "bg-[var(--color-warning)]/15 text-[var(--color-warning)]",
                        )}
                      >
                        Stock: {g.stockQty}
                      </span>
                    </div>
                  </div>
                  <form action={sendVariantNotificationsForm}>
                    <input type="hidden" name="variantId" value={g.variantId} />
                    <button
                      type="submit"
                      disabled={g.pendingCount === 0}
                      title={
                        backInStock
                          ? `Send to ${g.pendingCount} subscribers`
                          : "Stock is still 0 — sending anyway will tell them it's back when it isn't"
                      }
                      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-primary)] bg-[var(--color-primary)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--color-primary)] transition hover:bg-[var(--color-primary)] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Send className="h-3.5 w-3.5" />
                      إرسال إشعار ({g.pendingCount})
                    </button>
                  </form>
                </header>

                {/* Subscriber list */}
                <ul className="mt-4 divide-y divide-[var(--color-border)]">
                  {g.subscribers.map((s) => (
                    <li
                      key={s.id}
                      className="flex flex-wrap items-center gap-3 py-2 text-sm"
                    >
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
                          s.channel === "email"
                            ? "bg-[var(--color-accent)]/15 text-[var(--color-accent-dark)]"
                            : "bg-brass-500/15 text-brass-700",
                        )}
                      >
                        {s.channel}
                      </span>
                      <span
                        className="flex-1 truncate font-mono text-[12px] text-[var(--color-text)]"
                        dir="ltr"
                      >
                        {s.channel === "email"
                          ? s.guest_email ?? "—"
                          : s.guest_phone ?? "—"}
                      </span>
                      <span className="text-[11px] text-[var(--color-text-secondary)]">
                        {new Date(s.created_at).toLocaleDateString("en-US", {
                          dateStyle: "medium",
                        })}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
                          s.notified
                            ? "bg-[var(--color-success)]/15 text-[var(--color-success)]"
                            : "bg-[var(--color-warning)]/15 text-[var(--color-warning)]",
                        )}
                      >
                        {s.notified ? "Sent" : "Pending"}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      )}
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
  tone?: "warn" | "muted";
}) {
  const color =
    tone === "warn"
      ? "text-[var(--color-warning)]"
      : tone === "muted"
        ? "text-[var(--color-text-secondary)]"
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
