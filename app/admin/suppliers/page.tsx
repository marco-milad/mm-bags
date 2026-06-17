import Link from "next/link";
import { Power, PowerOff } from "lucide-react";
import { listSuppliers } from "@/lib/queries/suppliers-admin";
import {
  saveSupplier,
  toggleSupplierActive,
} from "@/lib/admin/supplier-actions";
import { getAdminLocale } from "@/lib/admin/locale";
import { formatPriceEGP } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Suppliers register.
 *
 * Layout:
 *   - Inline "Add supplier" form at the top (one input row — submits
 *     via the saveSupplier server action).
 *   - Table of all suppliers with phone, running totals (paid/owed),
 *     activation toggle, and a "View POs" link.
 *
 * We don't ship a separate detail page in this commit — the running
 * totals on the row + the per-supplier PO filter from the purchase-
 * orders list page cover the same need without doubling the surface.
 */
export default async function SuppliersPage() {
  const locale = await getAdminLocale();
  const isAr = locale === "ar";

  const suppliers = await listSuppliers();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl text-[var(--color-text)]">
          {isAr ? "الموردين" : "Suppliers"}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          {isAr
            ? "سجّل وأدر الموردين؛ الإجماليات بتتحدث تلقائيًا مع تسجيل أوامر الشراء والمدفوعات."
            : "Register and manage suppliers; running totals are kept in sync as purchase orders are recorded and paid."}
        </p>
      </header>

      {/* ─── Add form (server action) ────────────────────────────── */}
      <form
        action={saveSupplier}
        className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4"
      >
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
          {isAr ? "إضافة مورد" : "Add supplier"}
        </p>
        <div className="grid gap-3 md:grid-cols-[2fr_1fr_2fr_auto]">
          <input
            name="name"
            required
            placeholder={isAr ? "الاسم *" : "Name *"}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none"
          />
          <input
            name="phone"
            placeholder={isAr ? "الموبايل" : "Phone"}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none"
          />
          <input
            name="address"
            placeholder={isAr ? "العنوان" : "Address"}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white"
          >
            {isAr ? "إضافة" : "Add"}
          </button>
        </div>
      </form>

      {/* ─── Suppliers table ────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-[var(--color-surface)] text-[var(--color-text-secondary)]">
            <tr>
              <Th>{isAr ? "الاسم" : "Name"}</Th>
              <Th>{isAr ? "الموبايل" : "Phone"}</Th>
              <Th className="text-end">{isAr ? "إجمالي المدفوع" : "Total paid"}</Th>
              <Th className="text-end">{isAr ? "المستحق" : "Owed"}</Th>
              <Th>{isAr ? "الحالة" : "Status"}</Th>
              <Th className="text-end">{isAr ? "إجراءات" : "Actions"}</Th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => (
              <tr
                key={s.id}
                className="border-t border-[var(--color-border)] hover:bg-[var(--color-surface)]/50"
              >
                <td className="px-3 py-2 text-[var(--color-text)]">
                  {s.name}
                  {s.address && (
                    <p className="text-[11px] text-[var(--color-text-secondary)]">
                      {s.address}
                    </p>
                  )}
                </td>
                <td className="px-3 py-2 font-mono text-[12px] text-[var(--color-text-secondary)]">
                  {s.phone ?? "—"}
                </td>
                <td className="px-3 py-2 text-end font-mono text-sm text-[var(--color-success)]">
                  {formatPriceEGP(s.total_paid ?? 0)}
                </td>
                <td className="px-3 py-2 text-end font-mono text-sm">
                  <span
                    className={
                      (s.total_owed ?? 0) > 0
                        ? "text-[var(--color-error)]"
                        : "text-[var(--color-text-secondary)]"
                    }
                  >
                    {formatPriceEGP(s.total_owed ?? 0)}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <span
                    className={
                      s.is_active
                        ? "rounded-full bg-[var(--color-success)]/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--color-success)]"
                        : "rounded-full bg-[var(--color-surface-2)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-secondary)]"
                    }
                  >
                    {s.is_active
                      ? isAr
                        ? "نشط"
                        : "Active"
                      : isAr
                        ? "موقوف"
                        : "Disabled"}
                  </span>
                </td>
                <td className="px-3 py-2 text-end">
                  <div className="inline-flex items-center gap-2">
                    <Link
                      href={`/admin/purchase-orders?supplier=${s.id}`}
                      className="text-xs text-[var(--color-primary)] underline-offset-4 hover:underline"
                    >
                      {isAr ? "عرض أوامر الشراء" : "View POs"}
                    </Link>
                    <form action={toggleSupplierActive.bind(null, s.id)}>
                      <button
                        type="submit"
                        aria-label={
                          s.is_active
                            ? isAr
                              ? "إيقاف"
                              : "Deactivate"
                            : isAr
                              ? "تفعيل"
                              : "Activate"
                        }
                        className="grid h-7 w-7 place-items-center rounded-md border border-[var(--color-border)] text-[var(--color-text-secondary)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-text)]"
                      >
                        {s.is_active ? (
                          <PowerOff className="h-3.5 w-3.5" />
                        ) : (
                          <Power className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {suppliers.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-10 text-center text-xs text-[var(--color-text-secondary)]"
                >
                  {isAr
                    ? "مفيش موردين لسه. ابدأ بإضافة واحد من فوق علشان تسجل أوامر شراء."
                    : "No suppliers yet. Add one above to start logging purchase orders."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={
        "px-3 py-2 text-start text-[11px] font-semibold uppercase tracking-wider " +
        (className ?? "")
      }
    >
      {children}
    </th>
  );
}
