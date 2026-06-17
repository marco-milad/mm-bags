"use client";

import { Copy, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { createStaff } from "@/lib/admin/staff-actions";
import type { AdminLocale } from "@/lib/admin/locale";

/**
 * Add-staff form. Submits to the createStaff server action which
 * creates a Supabase auth user + staff row, returns a temp password
 * we show ONCE.
 *
 * Until the temp password is dismissed the form stays in "result"
 * state so the admin can copy it before it disappears.
 */
export function AddStaffForm({ locale }: { locale: AdminLocale }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const isAr = locale === "ar";

  function onSubmit(formData: FormData) {
    setError(null);
    setCopied(false);
    startTransition(async () => {
      const res = await createStaff(formData);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setTempPassword(res.tempPassword);
    });
  }

  if (tempPassword) {
    return (
      <div className="space-y-3 rounded-xl border border-[var(--color-success)]/40 bg-[var(--color-success)]/5 p-5">
        <p className="font-semibold text-[var(--color-text)]">
          {isAr
            ? "✅ تم إنشاء الموظف — شارك كلمة السر المؤقتة دي مرة واحدة:"
            : "✅ Staff created — share this temp password ONCE:"}
        </p>
        <div className="flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 font-mono text-lg">
          <span className="flex-1 select-all">{tempPassword}</span>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(tempPassword);
              setCopied(true);
            }}
            aria-label={isAr ? "نسخ" : "Copy"}
            className="rounded-md p-1.5 text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-[var(--color-text-secondary)]">
          {copied
            ? isAr
              ? "تم النسخ."
              : "Copied."
            : isAr
              ? "اضغط نسخ، وبعدها اطلب من الموظف الجديد يسجل دخول ويغير كلمة السر."
              : "Tap copy, then ask the new staffer to sign in and change it."}
        </p>
        <button
          type="button"
          onClick={() => setTempPassword(null)}
          className="rounded-full border border-[var(--color-border)] px-4 py-1.5 text-xs font-medium text-[var(--color-text)] hover:border-[var(--color-accent)]"
        >
          {isAr ? "إضافة موظف تاني" : "Add another"}
        </button>
      </div>
    );
  }

  return (
    <form
      action={onSubmit}
      className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4"
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
        {isAr ? "إضافة موظف" : "Add staff"}
      </p>
      <div className="grid gap-3 md:grid-cols-[1.5fr_2fr_1fr_1fr_auto]">
        <input
          name="name"
          required
          placeholder={isAr ? "الاسم *" : "Name *"}
          className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none"
        />
        <input
          name="email"
          type="email"
          required
          placeholder={isAr ? "الإيميل *" : "Email *"}
          className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none"
        />
        <input
          name="phone"
          placeholder={isAr ? "التليفون" : "Phone"}
          className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none"
        />
        <select
          name="role"
          defaultValue="cashier"
          className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
        >
          <option value="cashier">{isAr ? "كاشير" : "Cashier"}</option>
          <option value="manager">{isAr ? "مدير" : "Manager"}</option>
          <option value="admin">{isAr ? "أدمن" : "Admin"}</option>
        </select>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {isAr ? "إضافة" : "Add"}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-[var(--color-error)]">
          {error}
        </p>
      )}
    </form>
  );
}
