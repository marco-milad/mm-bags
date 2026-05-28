export default function AdminDashboard() {
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
    </section>
  );
}
