"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  deleteProduct,
  saveProduct,
  type DeleteResult,
  type ProductActionResult,
} from "@/lib/admin/product-actions";
import type { Collection, Product } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { ImageManager } from "./ImageManager";

/**
 * Shared product form for /admin/products/new + /admin/products/[id]/edit.
 *
 * Uses native `<form action={saveProduct}>` + `useActionState` so the
 * server-side `redirect()` on create works cleanly (the previous
 * `startTransition(await action)` pattern broke redirects and left
 * the submit spinner running forever — see the adversarial review).
 *
 * Error surface: saveProduct returns `{ ok: false, error: string }`
 * which we render as a banner. Delete lives in a SIBLING form so we
 * don't nest forms (invalid HTML).
 */
export function ProductForm({
  product,
  collections,
}: {
  product?: Product;
  collections: Collection[];
}) {
  const [slug, setSlug] = useState(product?.slug ?? "");
  const slugTouchedRef = useRef(slug !== "");
  const isEdit = !!product;

  // Slug auto-fill on EN-name blur until the admin types in the slug
  // input themselves.
  useEffect(() => {
    if (slug) slugTouchedRef.current = true;
  }, [slug]);

  function onNameEnBlur(e: React.FocusEvent<HTMLInputElement>) {
    if (slugTouchedRef.current) return;
    const generated = e.target.value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    if (generated) setSlug(generated);
  }

  // Save form state — useActionState handles redirect cleanly.
  const initialSaveState: ProductActionResult = { ok: true };
  const [saveState, saveAction] = useActionState(
    saveProduct,
    initialSaveState,
  );

  // Delete state in a sibling form (sibling to avoid nested-form HTML).
  const initialDeleteState: DeleteResult = { ok: true };
  const [deleteState, deleteAction] = useActionState(
    deleteProduct,
    initialDeleteState,
  );

  return (
    <div className="space-y-6">
      {saveState && !saveState.ok && (
        <Banner kind="error">{saveState.error}</Banner>
      )}
      {deleteState && !deleteState.ok && (
        <Banner kind="error">{deleteState.error}</Banner>
      )}

      <form action={saveAction} className="space-y-6">
        {isEdit && <input type="hidden" name="id" value={product.id} />}

        <Section title="Identification">
          <Row>
            <Field id="name_ar" label="Name (Arabic) *">
              <input
                id="name_ar"
                name="name_ar"
                required
                defaultValue={product?.name_ar ?? ""}
                dir="rtl"
                className={inputCls}
              />
            </Field>
            <Field id="name_en" label="Name (English) *">
              <input
                id="name_en"
                name="name_en"
                required
                defaultValue={product?.name_en ?? ""}
                onBlur={onNameEnBlur}
                className={inputCls}
              />
            </Field>
          </Row>
          <Row>
            <Field
              id="slug"
              label="Slug *"
              hint="Auto-fills from English name. URL-safe (a-z, 0-9, single dashes)."
            >
              <input
                id="slug"
                name="slug"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                className={cn(inputCls, "font-mono")}
              />
            </Field>
            <Field id="collection_id" label="Collection">
              <select
                id="collection_id"
                name="collection_id"
                defaultValue={product?.collection_id ?? ""}
                className={inputCls}
              >
                <option value="">(none)</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name_ar} · {c.name_en}
                  </option>
                ))}
              </select>
            </Field>
          </Row>
        </Section>

        <Section title="Descriptions">
          <Row>
            <Field id="description_ar" label="Description (Arabic)">
              <textarea
                id="description_ar"
                name="description_ar"
                dir="rtl"
                rows={4}
                defaultValue={product?.description_ar ?? ""}
                className={cn(inputCls, "resize-y")}
              />
            </Field>
            <Field id="description_en" label="Description (English)">
              <textarea
                id="description_en"
                name="description_en"
                rows={4}
                defaultValue={product?.description_en ?? ""}
                className={cn(inputCls, "resize-y")}
              />
            </Field>
          </Row>
        </Section>

        <Section title="Pricing">
          <Row>
            <Field id="base_price" label="Base price (EGP) *">
              <input
                id="base_price"
                name="base_price"
                type="number"
                required
                min={0}
                step="0.01"
                defaultValue={product?.base_price ?? 0}
                className={cn(inputCls, "font-mono")}
              />
            </Field>
            <Field
              id="sale_price"
              label="Sale price (EGP)"
              hint="Leave blank for no sale. Must be lower than base price."
            >
              <input
                id="sale_price"
                name="sale_price"
                type="number"
                min={0}
                step="0.01"
                defaultValue={product?.sale_price ?? ""}
                className={cn(inputCls, "font-mono")}
              />
            </Field>
          </Row>
        </Section>

        <Section title="Specifications">
          <Row>
            <Field id="material_type" label="Material type">
              <input
                id="material_type"
                name="material_type"
                defaultValue={product?.material_type ?? ""}
                className={inputCls}
              />
            </Field>
            <Field id="wheel_type" label="Wheel type">
              <input
                id="wheel_type"
                name="wheel_type"
                defaultValue={product?.wheel_type ?? ""}
                className={inputCls}
              />
            </Field>
          </Row>
          <Row>
            <Field id="lock_type" label="Lock type">
              <input
                id="lock_type"
                name="lock_type"
                defaultValue={product?.lock_type ?? ""}
                className={inputCls}
              />
            </Field>
            <Field
              id="dimensions"
              label="Dimensions"
              hint="Free-form, e.g. 44cm × 29.5cm × 23.5cm"
            >
              <input
                id="dimensions"
                name="dimensions"
                defaultValue={product?.dimensions ?? ""}
                className={inputCls}
              />
            </Field>
          </Row>
          <Row>
            <Field id="weight_kg" label="Weight (kg)">
              <input
                id="weight_kg"
                name="weight_kg"
                type="number"
                min={0}
                step="0.1"
                defaultValue={product?.weight_kg ?? ""}
                className={cn(inputCls, "font-mono")}
              />
            </Field>
            <Field id="laptop_inches" label="Laptop fit (inches)">
              <input
                id="laptop_inches"
                name="laptop_inches"
                type="number"
                min={0}
                step="0.1"
                defaultValue={product?.laptop_inches ?? ""}
                className={cn(inputCls, "font-mono")}
              />
            </Field>
          </Row>
          <Row>
            <Field id="capacity_liters" label="Capacity (liters)">
              <input
                id="capacity_liters"
                name="capacity_liters"
                type="number"
                min={0}
                step="0.1"
                defaultValue={product?.capacity_liters ?? ""}
                className={cn(inputCls, "font-mono")}
              />
            </Field>
            <Field id="flags" label="Flags">
              <div className="flex flex-wrap gap-3 pt-2">
                <Checkbox
                  name="is_water_resistant"
                  defaultChecked={product?.is_water_resistant ?? false}
                  label="Water-resistant"
                />
                <Checkbox
                  name="is_expandable"
                  defaultChecked={product?.is_expandable ?? false}
                  label="Expandable"
                />
              </div>
            </Field>
          </Row>
        </Section>

        <Section title="Display">
          <Row>
            <Field id="image_fit" label="Image fit">
              <Radios
                name="image_fit"
                value={product?.image_fit ?? "cover"}
                options={[
                  { value: "cover", label: "Cover (crop to fill)" },
                  { value: "contain", label: "Contain (letterbox)" },
                ]}
              />
            </Field>
            <Field id="image_aspect" label="Image aspect">
              <Radios
                name="image_aspect"
                value={product?.image_aspect ?? "square"}
                options={[
                  { value: "square", label: "Square" },
                  { value: "landscape", label: "Landscape" },
                  { value: "portrait", label: "Portrait" },
                ]}
              />
            </Field>
          </Row>
          <Row>
            <Field id="visibility" label="Visibility">
              <div className="flex flex-col gap-2 pt-2">
                <Checkbox
                  name="is_active"
                  defaultChecked={product?.is_active ?? true}
                  label="Active on website (visible in /catalog)"
                />
                <Checkbox
                  name="show_in_store"
                  defaultChecked={product?.show_in_store ?? true}
                  label="Available at POS (physical store)"
                />
              </div>
            </Field>
            <Field
              id="tags"
              label="Tags"
              hint="Comma-separated, e.g. best-seller, set"
            >
              <input
                id="tags"
                name="tags"
                defaultValue={(product?.tags ?? []).join(", ")}
                className={inputCls}
              />
            </Field>
          </Row>
        </Section>

        <Section title="Images">
          <ImageManager
            productId={product?.id}
            initial={product?.images ?? []}
          />
        </Section>

        <div className="flex items-center justify-end border-t border-[var(--color-border)] pt-4">
          <SaveButton isEdit={isEdit} />
        </div>
      </form>

      {/* Delete in a sibling form (NOT nested) so HTML stays valid. */}
      {isEdit && (
        <form action={deleteAction} className="border-t border-[var(--color-border)] pt-4">
          <input type="hidden" name="id" value={product.id} />
          <DeleteButton />
        </form>
      )}
    </div>
  );
}

// ─── Submit / Delete buttons with useFormStatus ─────────────────────
function SaveButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-full bg-brass-500 px-6 py-2.5 text-sm font-semibold text-navy-900 transition hover:bg-brass-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {isEdit ? "Save changes" : "Create product"}
    </button>
  );
}

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (
          !confirm(
            "Delete this product? Orders or wishlists referencing it will block the delete.",
          )
        )
          e.preventDefault();
      }}
      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-4 py-2 text-xs font-medium text-[var(--color-text-secondary)] transition hover:border-[var(--color-error)] hover:text-[var(--color-error)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-error)] focus-visible:ring-offset-2 disabled:opacity-60"
    >
      {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      <Trash2 className="h-3.5 w-3.5" />
      Delete product
    </button>
  );
}

// ─── Small layout helpers ───────────────────────────────────────────
function Banner({
  kind,
  children,
}: {
  kind: "error" | "success";
  children: React.ReactNode;
}) {
  const cls =
    kind === "error"
      ? "border-[var(--color-error)]/40 bg-[var(--color-error)]/10 text-[var(--color-error)]"
      : "border-[var(--color-success)]/40 bg-[var(--color-success)]/10 text-[var(--color-success)]";
  return (
    <p
      role="alert"
      className={cn("rounded-md border px-3 py-2 text-sm", cls)}
    >
      {children}
    </p>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5">
      <h2 className="mb-4 font-display text-lg text-[var(--color-text)]">
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>;
}
function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  // Hint sits OUTSIDE the <label> so screen readers don't read it
  // as part of the accessible name on every focus.
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className="block text-sm">
      <label
        htmlFor={id}
        className="mb-1 block text-xs uppercase tracking-wider text-[var(--color-text-secondary)]"
      >
        {label}
      </label>
      <div aria-describedby={hintId}>{children}</div>
      {hint && (
        <p
          id={hintId}
          className="mt-1 text-[11px] text-[var(--color-text-secondary)]"
        >
          {hint}
        </p>
      )}
    </div>
  );
}
function Checkbox({
  name,
  defaultChecked,
  label,
}: {
  name: string;
  defaultChecked: boolean;
  label: string;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-4 w-4 cursor-pointer accent-[var(--color-primary)]"
      />
      <span>{label}</span>
    </label>
  );
}
function Radios({
  name,
  value,
  options,
}: {
  name: string;
  value: string;
  options: ReadonlyArray<{ value: string; label: string }>;
}) {
  return (
    <div className="flex flex-col gap-1 pt-1">
      {options.map((o) => (
        <label key={o.value} className="inline-flex items-center gap-2 text-sm">
          <input
            type="radio"
            name={name}
            value={o.value}
            defaultChecked={value === o.value}
            className="h-4 w-4 cursor-pointer accent-[var(--color-primary)]"
          />
          <span>{o.label}</span>
        </label>
      ))}
    </div>
  );
}
const inputCls =
  "w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:border-[var(--color-accent)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40";
