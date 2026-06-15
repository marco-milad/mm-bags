import Link from "next/link";
import { Search } from "lucide-react";
import {
  LOW_STOCK_THRESHOLD,
  listLowStockByCollection,
  listStockMovements,
  listStockRows,
  type MovementRow,
  type StockRow,
} from "@/lib/queries/stock-admin";
import { AdjustButton } from "@/components/admin/stock/AdjustButton";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Tab = "current" | "movements" | "low-stock";

const TABS: ReadonlyArray<{ id: Tab; label: string }> = [
  { id: "current", label: "Current stock" },
  { id: "movements", label: "Stock movements" },
  { id: "low-stock", label: "Low-stock alerts" },
];

/**
 * /admin/stock — three-tab inventory cockpit.
 *   1. Current stock: every variant with status badge + adjust +/-.
 *   2. Stock movements: append-only timeline of every change.
 *   3. Low-stock alerts: out + low variants grouped by collection
 *      with a "Create PO" CTA per row that preselects the variant on
 *      the new-purchase-order form.
 *
 * Tab is URL-driven (?tab=current|movements|low-stock) so the admin
 * can refresh and stay on the same view, and so the active tab
 * survives the revalidatePath() after a stock adjustment.
 */
export default async function StockPage({
  searchParams,
}: PageProps<"/admin/stock">) {
  const sp = await searchParams;
  const tabParam = typeof sp?.tab === "string" ? sp.tab : "current";
  const tab: Tab = (TABS.find((t) => t.id === tabParam)?.id ?? "current") as Tab;
  const q = typeof sp?.q === "string" ? sp.q : undefined;
  const collectionSlug =
    typeof sp?.collection === "string" ? sp.collection : undefined;
  const statusFilter =
    sp?.status === "out" || sp?.status === "low" || sp?.status === "ok"
      ? (sp.status as StockRow["status"])
      : undefined;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl text-[var(--color-text)]">
          Stock · المخزون
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Current stock, movement ledger, and low-stock alerts.
        </p>
      </header>

      {/* Tab bar — preserves the other query params on tab switch so
          the search + filters survive. */}
      <nav className="flex gap-1 border-b border-[var(--color-border)]">
        {TABS.map((t) => {
          const params = new URLSearchParams();
          params.set("tab", t.id);
          if (t.id === "current") {
            if (q) params.set("q", q);
            if (collectionSlug) params.set("collection", collectionSlug);
            if (statusFilter) params.set("status", statusFilter);
          }
          return (
            <Link
              key={t.id}
              href={`/admin/stock?${params.toString()}`}
              className={cn(
                "border-b-2 px-4 py-2 text-sm font-medium transition",
                t.id === tab
                  ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                  : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text)]",
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      {tab === "current" && (
        <CurrentStockTab
          q={q}
          collectionSlug={collectionSlug}
          status={statusFilter}
        />
      )}
      {tab === "movements" && <MovementsTab />}
      {tab === "low-stock" && <LowStockTab />}
    </div>
  );
}

// ─── Tab 1 ──────────────────────────────────────────────────────────
async function CurrentStockTab({
  q,
  collectionSlug,
  status,
}: {
  q?: string;
  collectionSlug?: string;
  status?: StockRow["status"];
}) {
  const rows = await listStockRows({ q, collectionSlug, status });
  return (
    <section className="space-y-3">
      {/* Filter bar — a plain GET form so reloads / shareable URLs
          carry the current view. */}
      <form className="flex flex-wrap items-center gap-2" action="/admin/stock">
        <input type="hidden" name="tab" value="current" />
        <div className="relative flex-1 min-w-[200px]">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-secondary)]"
          />
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search by name or SKU..."
            className="h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] pl-9 pr-3 text-sm focus:border-[var(--color-accent)] focus:outline-none"
          />
        </div>
        <select
          name="status"
          defaultValue={status ?? ""}
          className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm"
        >
          <option value="">All statuses</option>
          <option value="ok">متوفر (&gt;{LOW_STOCK_THRESHOLD})</option>
          <option value="low">منخفض (1–{LOW_STOCK_THRESHOLD})</option>
          <option value="out">نفذ (0)</option>
        </select>
        <button
          type="submit"
          className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white"
        >
          Apply
        </button>
      </form>

      <p className="text-xs text-[var(--color-text-secondary)]">
        {rows.length} variant{rows.length === 1 ? "" : "s"}
      </p>

      <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-[var(--color-surface)] text-[var(--color-text-secondary)]">
            <tr>
              <Th>Product</Th>
              <Th>Variant</Th>
              <Th>SKU</Th>
              <Th className="text-end">Stock</Th>
              <Th>Status</Th>
              <Th className="text-end">Adjust</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.variantId}
                className="border-t border-[var(--color-border)] hover:bg-[var(--color-surface)]/50"
              >
                <td className="px-3 py-2">
                  <Link
                    href={`/ar/products/${r.productSlug}`}
                    target="_blank"
                    className="text-[var(--color-text)] hover:underline"
                  >
                    {r.productName}
                  </Link>
                  {r.collectionName && (
                    <span className="ms-2 font-mono text-[10px] text-[var(--color-text-secondary)]">
                      · {r.collectionName}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-1.5">
                    {r.colorHex && (
                      <span
                        aria-hidden
                        className="h-3.5 w-3.5 rounded-full ring-1 ring-[var(--color-border)]"
                        style={{ background: r.colorHex }}
                      />
                    )}
                    <span className="text-[13px]">
                      {[r.color, r.size].filter(Boolean).join(" · ") || "—"}
                    </span>
                  </span>
                </td>
                <td className="px-3 py-2 font-mono text-[11px] text-[var(--color-text-secondary)]">
                  {r.sku ?? "—"}
                </td>
                <td className="px-3 py-2 text-end font-mono text-sm">
                  {r.stockQty}
                </td>
                <td className="px-3 py-2">
                  <StockBadge status={r.status} qty={r.stockQty} />
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-1">
                    <AdjustButton variantId={r.variantId} delta={-1} />
                    <AdjustButton variantId={r.variantId} delta={+1} />
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-xs text-[var(--color-text-secondary)]">
                  No matching variants.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ─── Tab 2 ──────────────────────────────────────────────────────────
async function MovementsTab() {
  const rows = await listStockMovements({ limit: 200 });
  return (
    <section className="space-y-3">
      <p className="text-xs text-[var(--color-text-secondary)]">
        Last {rows.length} movements · newest first.
      </p>
      <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-[var(--color-surface)] text-[var(--color-text-secondary)]">
            <tr>
              <Th>When</Th>
              <Th>Product</Th>
              <Th>Variant</Th>
              <Th>Type</Th>
              <Th className="text-end">Change</Th>
              <Th className="text-end">Before → After</Th>
              <Th>Notes</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <MovementRowView key={m.id} m={m} />
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-xs text-[var(--color-text-secondary)]">
                  No stock movements recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MovementRowView({ m }: { m: MovementRow }) {
  const pos = m.qtyChange > 0;
  return (
    <tr className="border-t border-[var(--color-border)]">
      <td className="whitespace-nowrap px-3 py-2 text-[11px] text-[var(--color-text-secondary)]">
        {new Date(m.createdAt).toLocaleString("en-US", {
          dateStyle: "short",
          timeStyle: "short",
        })}
      </td>
      <td className="px-3 py-2">
        {m.productSlug ? (
          <Link
            href={`/ar/products/${m.productSlug}`}
            target="_blank"
            className="text-[var(--color-text)] hover:underline"
          >
            {m.productName}
          </Link>
        ) : (
          <span className="text-[var(--color-text-secondary)]">
            {m.productName}
          </span>
        )}
      </td>
      <td className="px-3 py-2 text-[12px] text-[var(--color-text-secondary)]">
        {[m.color, m.size].filter(Boolean).join(" · ") || "—"}
      </td>
      <td className="px-3 py-2">
        <MovementTypeBadge type={m.type} />
      </td>
      <td
        className={cn(
          "px-3 py-2 text-end font-mono text-sm",
          pos ? "text-[var(--color-success)]" : "text-[var(--color-error)]",
        )}
      >
        {pos ? "+" : ""}
        {m.qtyChange}
      </td>
      <td className="px-3 py-2 text-end font-mono text-[11px] text-[var(--color-text-secondary)]">
        {m.qtyBefore} → {m.qtyAfter}
      </td>
      <td className="px-3 py-2 text-[12px] text-[var(--color-text-secondary)]">
        {m.notes ?? "—"}
      </td>
    </tr>
  );
}

// ─── Tab 3 ──────────────────────────────────────────────────────────
async function LowStockTab() {
  const groups = await listLowStockByCollection();
  if (groups.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-10 text-center text-xs text-[var(--color-text-secondary)]">
        All variants above the low-stock threshold ({LOW_STOCK_THRESHOLD}).
        Nothing to flag.
      </p>
    );
  }
  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g.collectionSlug ?? g.collectionName}>
          <h2 className="mb-2 font-display text-lg text-[var(--color-text)]">
            {g.collectionName}
            <span className="ms-2 font-mono text-xs text-[var(--color-text-secondary)]">
              ({g.rows.length})
            </span>
          </h2>
          <ul className="space-y-2">
            {g.rows.map((r) => (
              <li
                key={r.variantId}
                className="flex flex-wrap items-center gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
              >
                {r.colorHex && (
                  <span
                    aria-hidden
                    className="h-4 w-4 shrink-0 rounded-full ring-1 ring-[var(--color-border)]"
                    style={{ background: r.colorHex }}
                  />
                )}
                <span className="flex-1 text-[var(--color-text)]">
                  {r.productName}
                  <span className="ms-2 font-mono text-[11px] text-[var(--color-text-secondary)]">
                    {[r.color, r.size].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <StockBadge status={r.status} qty={r.stockQty} />
                <Link
                  href={`/admin/purchase-orders/new?variantId=${r.variantId}`}
                  className="inline-flex items-center rounded-full border border-brass-500/40 bg-brass-500/10 px-3 py-1 text-[11px] font-semibold text-brass-700 transition hover:bg-brass-500 hover:text-navy-900"
                >
                  طلب توريد
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

// ─── Small UI pieces ─────────────────────────────────────────────────
function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={cn(
        "px-3 py-2 text-start text-[11px] font-semibold uppercase tracking-wider",
        className,
      )}
    >
      {children}
    </th>
  );
}

function StockBadge({
  status,
  qty,
}: {
  status: StockRow["status"];
  qty: number;
}) {
  const meta = {
    out: {
      label: `نفذ (${qty})`,
      cls: "bg-[var(--color-error)]/15 text-[var(--color-error)]",
    },
    low: {
      label: `منخفض (${qty})`,
      cls: "bg-[var(--color-warning)]/15 text-[var(--color-warning)]",
    },
    ok: {
      label: `متوفر (${qty})`,
      cls: "bg-[var(--color-success)]/15 text-[var(--color-success)]",
    },
  }[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold",
        meta.cls,
      )}
    >
      {meta.label}
    </span>
  );
}

function MovementTypeBadge({ type }: { type: MovementRow["type"] }) {
  const meta: Record<
    MovementRow["type"],
    { label: string; cls: string }
  > = {
    purchase_in: { label: "Purchase in", cls: "bg-[var(--color-success)]/15 text-[var(--color-success)]" },
    online_sale: { label: "Online sale", cls: "bg-[var(--color-primary)]/15 text-[var(--color-primary)]" },
    pos_sale: { label: "POS sale", cls: "bg-brass-500/15 text-brass-700" },
    adjustment: { label: "Adjustment", cls: "bg-[var(--color-accent)]/15 text-[var(--color-accent-dark)]" },
    return: { label: "Return", cls: "bg-[var(--color-warning)]/15 text-[var(--color-warning)]" },
    transfer: { label: "Transfer", cls: "bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]" },
  };
  const m = meta[type];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
        m.cls,
      )}
    >
      {m.label}
    </span>
  );
}
