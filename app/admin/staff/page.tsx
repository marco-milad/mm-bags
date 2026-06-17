import { redirect } from "next/navigation";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { AddStaffForm } from "@/components/admin/staff/AddStaffForm";
import {
  getCurrentRole,
  updateStaff,
} from "@/lib/admin/staff-actions";
import { getAdminLocale } from "@/lib/admin/locale";
import type { Staff, StaffRole } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

/**
 * /admin/staff — admin-only register of staff users.
 *
 * Layout:
 *   - Add-staff form (creates auth user + staff row, returns a
 *     one-time temp password the admin must hand off).
 *   - Table of every staff record with their role + active toggle.
 *
 * Only the resolved "admin" role can see this page. Managers and
 * cashiers get redirected to /admin (they shouldn't be able to mint
 * new accounts).
 */
export default async function StaffPage() {
  const locale = await getAdminLocale();
  const isAr = locale === "ar";
  const role = await getCurrentRole();
  if (!role || role.role !== "admin") {
    redirect("/admin");
  }
  const admin = getSupabaseAdminClient();
  const { data: rows } = await admin
    .from("staff")
    .select("*")
    .order("created_at", { ascending: false });
  const staff = (rows ?? []) as Staff[];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl text-[var(--color-text)]">
          {isAr ? "الموظفين" : "Staff"}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          {isAr
            ? "الكاشير بيشوف نقطة البيع بس. المدير بيشوف نقطة البيع + الطلبات + المخزون + التقارير. الأدمن بيشوف كل حاجة."
            : "Cashier-only sees POS. Manager sees POS + orders + stock + reports. Admin sees everything."}
        </p>
      </header>

      <AddStaffForm locale={locale} />

      <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-surface)] text-[var(--color-text-secondary)]">
            <tr>
              <Th>{isAr ? "الاسم" : "Name"}</Th>
              <Th>{isAr ? "التليفون" : "Phone"}</Th>
              <Th>{isAr ? "الدور" : "Role"}</Th>
              <Th>{isAr ? "الحالة" : "Status"}</Th>
              <Th>{isAr ? "تاريخ الإنشاء" : "Created"}</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id} className="border-t border-[var(--color-border)]">
                <td className="px-3 py-2 text-[var(--color-text)]">{s.name}</td>
                <td className="px-3 py-2 font-mono text-[12px] text-[var(--color-text-secondary)]">
                  {s.phone ?? "—"}
                </td>
                <td className="px-3 py-2">
                  <form
                    action={updateStaff}
                    className="inline-flex items-center gap-2"
                  >
                    <input type="hidden" name="id" value={s.id} />
                    <select
                      name="role"
                      defaultValue={s.role as StaffRole}
                      className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-xs"
                    >
                      <option value="cashier">{isAr ? "كاشير" : "Cashier"}</option>
                      <option value="manager">{isAr ? "مدير" : "Manager"}</option>
                      <option value="admin">{isAr ? "أدمن" : "Admin"}</option>
                    </select>
                    <button
                      type="submit"
                      className="rounded-md border border-[var(--color-border)] px-2 py-1 text-[10px] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-text)]"
                    >
                      {isAr ? "حفظ" : "Save"}
                    </button>
                  </form>
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
                        ? "معطل"
                        : "Disabled"}
                  </span>
                </td>
                <td className="px-3 py-2 text-[11px] text-[var(--color-text-secondary)]">
                  {new Date(s.created_at).toLocaleDateString(
                    isAr ? "ar-EG" : "en-US",
                    {
                      dateStyle: "medium",
                    },
                  )}
                </td>
                <td className="px-3 py-2 text-end">
                  <form action={updateStaff} className="inline">
                    <input type="hidden" name="id" value={s.id} />
                    <input
                      type="hidden"
                      name="isActive"
                      value={s.is_active ? "0" : "1"}
                    />
                    <button
                      type="submit"
                      className="text-xs text-[var(--color-text-secondary)] underline-offset-4 hover:text-[var(--color-text)] hover:underline"
                    >
                      {s.is_active
                        ? isAr
                          ? "إلغاء التفعيل"
                          : "Deactivate"
                        : isAr
                          ? "تفعيل"
                          : "Activate"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {staff.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-10 text-center text-xs text-[var(--color-text-secondary)]"
                >
                  {isAr
                    ? "لا يوجد موظفين بعد. أضف أول كاشير أو مدير من فوق."
                    : "No staff yet. Add the first cashier or manager above."}
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
  children?: React.ReactNode;
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
