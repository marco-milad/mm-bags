"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { saveSupplier } from "@/lib/admin/supplier-actions";
import type { Supplier } from "@/lib/supabase/types";

/**
 * Edit-in-place dialog for an existing supplier row. The same
 * `saveSupplier` action handles both insert (no id) and update (with
 * id) — the suppliers page had only the insert path wired up, leaving
 * the update path orphaned. This component is the missing UI half.
 *
 * Closes on submit because the parent page revalidates and re-renders
 * with the fresh row contents.
 */
export function SupplierEditDialog({
  supplier,
  isAr,
}: {
  supplier: Pick<Supplier, "id" | "name" | "phone" | "address" | "notes">;
  isAr: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={isAr ? "تعديل" : "Edit"}
          className="grid h-7 w-7 place-items-center rounded-md border border-[var(--color-border)] text-[var(--color-text-secondary)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-text)]"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </DialogTrigger>
      <DialogContent closeAriaLabel={isAr ? "إغلاق" : "Close"}>
        <DialogTitle className="border-b border-[var(--color-border)] px-5 py-4 font-display text-lg text-[var(--color-text)]">
          {isAr ? "تعديل بيانات المورد" : "Edit supplier"}
        </DialogTitle>
        <form
          action={async (formData) => {
            await saveSupplier(formData);
            setOpen(false);
          }}
          className="space-y-3 p-5"
        >
          <input type="hidden" name="id" value={supplier.id} />
          <Field id="supplier-name" label={isAr ? "الاسم *" : "Name *"}>
            <input
              id="supplier-name"
              name="name"
              required
              defaultValue={supplier.name}
              className={inputCls}
            />
          </Field>
          <Field id="supplier-phone" label={isAr ? "الموبايل" : "Phone"}>
            <input
              id="supplier-phone"
              name="phone"
              defaultValue={supplier.phone ?? ""}
              className={inputCls}
            />
          </Field>
          <Field id="supplier-address" label={isAr ? "العنوان" : "Address"}>
            <input
              id="supplier-address"
              name="address"
              defaultValue={supplier.address ?? ""}
              className={inputCls}
            />
          </Field>
          <Field id="supplier-notes" label={isAr ? "ملاحظات" : "Notes"}>
            <textarea
              id="supplier-notes"
              name="notes"
              rows={3}
              defaultValue={supplier.notes ?? ""}
              className={`${inputCls} resize-y`}
            />
          </Field>
          <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] pt-4">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)] transition hover:text-[var(--color-text)]"
            >
              {isAr ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="submit"
              className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white"
            >
              {isAr ? "حفظ" : "Save"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const inputCls =
  "w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none";

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
