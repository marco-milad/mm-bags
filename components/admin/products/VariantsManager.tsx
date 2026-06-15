"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  useActionState,
  useEffect,
  useState,
  useRef,
} from "react";
import { useFormStatus } from "react-dom";
import {
  deleteVariant,
  saveVariant,
  type VariantActionResult,
} from "@/lib/admin/product-actions";
import type { ProductVariant } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

/**
 * Variants editor.
 *
 * Each existing variant gets its own `<form action={saveVariant}>`,
 * wired through `useActionState` so duplicate-SKU and validation
 * errors surface inline. The Delete form is a SIBLING of the Save
 * form (NOT nested — nested <form> is invalid HTML).
 *
 * Per the adversarial review, the per-row pattern uses the
 * form-attribute association from a `<form>` element rendered as the
 * row's FIRST cell, with sibling inputs in other cells referencing
 * it via `form="…"`. That spec-legal pattern is what the row layout
 * uses so we can keep an actual `<table>` while still binding many
 * forms.
 *
 * Add-row reset: the AddVariantRow only clears AFTER the server
 * confirms success (via useActionState's `ok: true` result),
 * preserving the admin's input when the action fails.
 */
export function VariantsManager({
  productId,
  variants,
}: {
  productId: string;
  variants: ProductVariant[];
}) {
  return (
    <section className="space-y-3">
      <header className="flex items-baseline justify-between gap-2">
        <h2 className="font-display text-lg text-[var(--color-text)]">
          Variants
        </h2>
        <p className="text-xs text-[var(--color-text-secondary)]">
          {variants.length} variant{variants.length === 1 ? "" : "s"}
        </p>
      </header>

      <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-surface)] text-[var(--color-text-secondary)]">
            <tr>
              <Th>Color AR</Th>
              <Th>Color EN</Th>
              <Th>Color</Th>
              <Th className="text-end">Size (in)</Th>
              <Th>Size label AR</Th>
              <Th className="text-end">Stock</Th>
              <Th className="text-end">Override</Th>
              <Th>SKU</Th>
              <Th>Set</Th>
              <Th aria-label="Actions"></Th>
            </tr>
          </thead>
          <tbody>
            {variants.map((v) => (
              <VariantRow key={v.id} productId={productId} variant={v} />
            ))}
            <AddVariantRow productId={productId} />
          </tbody>
        </table>
      </div>
    </section>
  );
}

const cellInputCls =
  "w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-[12px] focus-visible:outline-none focus-visible:border-[var(--color-accent)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40";

function VariantRow({
  productId,
  variant,
}: {
  productId: string;
  variant: ProductVariant;
}) {
  const formId = `v-${variant.id}`;
  // Track whether the row has a color set — pre-checked when the
  // variant already has color_hex, lets the user opt out → null.
  const [hasColor, setHasColor] = useState<boolean>(!!variant.color_hex);
  const [state, action] = useActionState<VariantActionResult, FormData>(
    async (_prev: VariantActionResult, fd: FormData) => saveVariant(_prev, fd),
    { ok: true } as VariantActionResult,
  );

  return (
    <>
      <tr className="border-t border-[var(--color-border)] align-top">
        {/* Empty form lives in first cell; inputs across the row
            reference it via form= attribute. */}
        <td className="px-2 py-1.5">
          <form id={formId} action={action} />
          <input
            type="hidden"
            name="id"
            value={variant.id}
            form={formId}
          />
          <input
            type="hidden"
            name="product_id"
            value={productId}
            form={formId}
          />
          <input
            name="color_ar"
            dir="rtl"
            defaultValue={variant.color_ar ?? ""}
            form={formId}
            aria-label="Color (Arabic)"
            className={cellInputCls}
          />
        </td>
        <td className="px-2 py-1.5">
          <input
            name="color_en"
            defaultValue={variant.color_en ?? ""}
            form={formId}
            aria-label="Color (English)"
            className={cellInputCls}
          />
        </td>
        <td className="px-2 py-1.5">
          <div className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={hasColor}
              onChange={(e) => setHasColor(e.target.checked)}
              form={formId}
              name="color_hex_use"
              aria-label="Use color"
              className="h-3.5 w-3.5 cursor-pointer accent-[var(--color-primary)]"
            />
            <input
              name="color_hex"
              type="color"
              defaultValue={variant.color_hex ?? "#000000"}
              disabled={!hasColor}
              form={formId}
              aria-label="Color hex"
              title="Color hex"
              className="h-7 w-7 cursor-pointer rounded border border-[var(--color-border)] bg-transparent disabled:opacity-40"
            />
          </div>
        </td>
        <td className="px-2 py-1.5 text-end">
          <input
            name="size_inches"
            type="number"
            min={0}
            step={1}
            defaultValue={variant.size_inches ?? ""}
            form={formId}
            aria-label="Size in inches"
            className={cn(cellInputCls, "w-16 text-end")}
          />
        </td>
        <td className="px-2 py-1.5">
          <input
            name="size_label_ar"
            dir="rtl"
            defaultValue={variant.size_label_ar ?? ""}
            form={formId}
            aria-label="Size label (Arabic)"
            className={cellInputCls}
          />
        </td>
        <td className="px-2 py-1.5 text-end">
          <input
            name="stock_qty"
            type="number"
            min={0}
            step={1}
            required
            defaultValue={variant.stock_qty}
            form={formId}
            aria-label="Stock quantity"
            className={cn(cellInputCls, "w-16 text-end")}
          />
        </td>
        <td className="px-2 py-1.5 text-end">
          <input
            name="price_override"
            type="number"
            min={0}
            step="0.01"
            defaultValue={variant.price_override ?? ""}
            form={formId}
            aria-label="Price override"
            className={cn(cellInputCls, "w-20 text-end")}
          />
        </td>
        <td className="px-2 py-1.5">
          <input
            name="sku"
            defaultValue={variant.sku ?? ""}
            form={formId}
            aria-label="SKU"
            className={cn(cellInputCls, "w-28 font-mono text-[11px]")}
          />
        </td>
        <td className="px-2 py-1.5 text-center">
          <input
            name="is_set"
            type="checkbox"
            defaultChecked={variant.is_set}
            form={formId}
            aria-label="Is a set"
            className="h-4 w-4 cursor-pointer accent-[var(--color-primary)]"
          />
        </td>
        <td className="px-2 py-1.5 text-end">
          <div className="flex justify-end gap-1">
            <RowSaveButton formId={formId} />
            {/* Delete is a SEPARATE sibling form (not nested). */}
            <form
              action={deleteVariant}
              onSubmit={(e) => {
                if (!confirm("Delete this variant?")) e.preventDefault();
              }}
            >
              <input type="hidden" name="id" value={variant.id} />
              <input type="hidden" name="product_id" value={productId} />
              <RowDeleteButton />
            </form>
          </div>
        </td>
      </tr>
      {state && !state.ok && (
        <tr>
          <td colSpan={10} className="px-2 pb-1.5">
            <p
              role="alert"
              className="rounded-md border border-[var(--color-error)]/40 bg-[var(--color-error)]/10 px-2 py-1 text-[11px] text-[var(--color-error)]"
            >
              {state.error}
            </p>
          </td>
        </tr>
      )}
    </>
  );
}

function AddVariantRow({ productId }: { productId: string }) {
  const [hasColor, setHasColor] = useState(false);
  const [state, action] = useActionState<VariantActionResult, FormData>(
    async (_prev: VariantActionResult, fd: FormData) => saveVariant(_prev, fd),
    { ok: true } as VariantActionResult,
  );
  // Reset key bumps AFTER the action returns ok:true (NOT on submit-fire).
  // This means input is preserved when the action errors.
  const [resetKey, setResetKey] = useState(0);
  const prevStateRef = useRef<VariantActionResult>({ ok: true });
  useEffect(() => {
    if (state.ok && !prevStateRef.current.ok === false) {
      // First mount or success after previous success — no-op.
    }
    if (state.ok && prevStateRef.current !== state) {
      // ok=true after action ran → bump the reset key.
      setResetKey((k) => k + 1);
    }
    prevStateRef.current = state;
  }, [state]);

  const formId = `v-new-${resetKey}`;
  return (
    <>
      <tr
        key={resetKey}
        className="border-t-2 border-[var(--color-accent)]/30 bg-[var(--color-surface)]/40 align-top"
      >
        <td className="px-2 py-1.5">
          <form id={formId} action={action} />
          <input
            type="hidden"
            name="product_id"
            value={productId}
            form={formId}
          />
          <input
            name="color_ar"
            dir="rtl"
            placeholder="أسود"
            form={formId}
            aria-label="Color (Arabic)"
            className={cellInputCls}
          />
        </td>
        <td className="px-2 py-1.5">
          <input
            name="color_en"
            placeholder="Black"
            form={formId}
            aria-label="Color (English)"
            className={cellInputCls}
          />
        </td>
        <td className="px-2 py-1.5">
          <div className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={hasColor}
              onChange={(e) => setHasColor(e.target.checked)}
              form={formId}
              name="color_hex_use"
              aria-label="Use color"
              className="h-3.5 w-3.5 cursor-pointer accent-[var(--color-primary)]"
            />
            <input
              name="color_hex"
              type="color"
              defaultValue="#000000"
              disabled={!hasColor}
              form={formId}
              aria-label="Color hex"
              title="Color hex"
              className="h-7 w-7 cursor-pointer rounded border border-[var(--color-border)] bg-transparent disabled:opacity-40"
            />
          </div>
        </td>
        <td className="px-2 py-1.5 text-end">
          <input
            name="size_inches"
            type="number"
            min={0}
            step={1}
            placeholder="24"
            form={formId}
            aria-label="Size in inches"
            className={cn(cellInputCls, "w-16 text-end")}
          />
        </td>
        <td className="px-2 py-1.5">
          <input
            name="size_label_ar"
            dir="rtl"
            form={formId}
            aria-label="Size label (Arabic)"
            className={cellInputCls}
          />
        </td>
        <td className="px-2 py-1.5 text-end">
          <input
            name="stock_qty"
            type="number"
            min={0}
            step={1}
            required
            defaultValue={0}
            form={formId}
            aria-label="Stock quantity"
            className={cn(cellInputCls, "w-16 text-end")}
          />
        </td>
        <td className="px-2 py-1.5 text-end">
          <input
            name="price_override"
            type="number"
            min={0}
            step="0.01"
            form={formId}
            aria-label="Price override"
            className={cn(cellInputCls, "w-20 text-end")}
          />
        </td>
        <td className="px-2 py-1.5">
          <input
            name="sku"
            placeholder="SKU"
            form={formId}
            aria-label="SKU"
            className={cn(cellInputCls, "w-28 font-mono text-[11px]")}
          />
        </td>
        <td className="px-2 py-1.5 text-center">
          <input
            name="is_set"
            type="checkbox"
            form={formId}
            aria-label="Is a set"
            className="h-4 w-4 cursor-pointer accent-[var(--color-primary)]"
          />
        </td>
        <td className="px-2 py-1.5 text-end">
          <AddSubmitButton formId={formId} />
        </td>
      </tr>
      {state && !state.ok && (
        <tr>
          <td colSpan={10} className="px-2 pb-1.5">
            <p
              role="alert"
              className="rounded-md border border-[var(--color-error)]/40 bg-[var(--color-error)]/10 px-2 py-1 text-[11px] text-[var(--color-error)]"
            >
              {state.error}
            </p>
          </td>
        </tr>
      )}
    </>
  );
}

function RowSaveButton({ formId }: { formId: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      form={formId}
      disabled={pending}
      className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2 py-1 text-[10px] font-semibold text-[var(--color-text)] hover:border-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] disabled:opacity-60"
    >
      {pending && <Loader2 className="h-3 w-3 animate-spin" />}
      Save
    </button>
  );
}

function RowDeleteButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label="Delete variant"
      className="grid h-7 w-7 place-items-center rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-secondary)] hover:border-[var(--color-error)] hover:text-[var(--color-error)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-error)] disabled:opacity-60"
    >
      {pending ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Trash2 className="h-3 w-3" />
      )}
    </button>
  );
}

function AddSubmitButton({ formId }: { formId: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      form={formId}
      disabled={pending}
      className="inline-flex items-center gap-1 rounded-md bg-[var(--color-primary)] px-2 py-1 text-[10px] font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] disabled:opacity-60"
    >
      {pending ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Plus className="h-3 w-3" />
      )}
      Add
    </button>
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
        "px-2 py-2 text-start text-[10px] font-semibold uppercase tracking-wider " +
        (className ?? "")
      }
      {...rest}
    >
      {children}
    </th>
  );
}
