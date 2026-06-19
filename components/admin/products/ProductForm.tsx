"use client";

import { CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  deleteProduct,
  saveProduct,
  type DeleteResult,
  type ProductActionResult,
} from "@/lib/admin/product-actions";
import type { AdminLocale } from "@/lib/admin/locale";
import type { ProductFieldSuggestions } from "@/lib/queries/admin-products";
import type { Collection, Product } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { ImageManager } from "./ImageManager";
import { SuggestInput } from "./SuggestInput";

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
  locale,
  suggestions,
  justCreated,
}: {
  product?: Product;
  collections: Collection[];
  locale: AdminLocale;
  /** Existing values from the rest of the catalog, surfaced by the
      spec field comboboxes. Optional so older call-sites don't break;
      an empty object falls through to a plain `<input>` behaviour. */
  suggestions?: ProductFieldSuggestions;
  /** Set to true when the user just landed here from a successful
      "Create product" submit (the redirect attaches `?created=1`).
      Triggers a one-shot success banner with the same auto-dismiss
      as the edit-save banner. */
  justCreated?: boolean;
}) {
  const isAr = locale === "ar";
  const [slug, setSlug] = useState(product?.slug ?? "");
  const slugTouchedRef = useRef(slug !== "");
  const isEdit = !!product;
  const sug: ProductFieldSuggestions =
    suggestions ?? {
      material_type: [],
      wheel_type: [],
      lock_type: [],
      dimensions: [],
      tags: [],
    };

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

  // Per-field error map from the last save attempt. Empty when the
  // form has not been submitted yet or the submission succeeded.
  const fieldErrors =
    saveState && !saveState.ok ? (saveState.fieldErrors ?? {}) : {};
  const hasFieldErrors = Object.keys(fieldErrors).length > 0;

  // One-shot success banner — fires on a fresh `?created=1` landing
  // or whenever the edit form returns `{ok: true, saved: true}`. The
  // banner auto-dismisses so a repeated save isn't a no-op (the state
  // would still be `saved=true` and the banner wouldn't re-flash).
  const editJustSaved =
    saveState && saveState.ok && "saved" in saveState && saveState.saved;
  const [showSavedBanner, setShowSavedBanner] = useState(
    Boolean(justCreated),
  );
  useEffect(() => {
    if (editJustSaved) setShowSavedBanner(true);
  }, [editJustSaved]);
  useEffect(() => {
    if (!showSavedBanner) return;
    const t = window.setTimeout(() => setShowSavedBanner(false), 4500);
    return () => window.clearTimeout(t);
  }, [showSavedBanner]);

  return (
    <div className="space-y-6">
      {showSavedBanner && (
        <Banner kind="success">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>
            {justCreated
              ? isAr
                ? "تم إنشاء المنتج بنجاح."
                : "Product created successfully."
              : isAr
                ? "تم حفظ التعديلات."
                : "Changes saved."}
          </span>
        </Banner>
      )}
      {saveState && !saveState.ok && (
        <Banner kind="error">
          {hasFieldErrors ? "يرجى تصحيح الأخطاء بالأسفل" : saveState.error}
        </Banner>
      )}
      {deleteState && !deleteState.ok && (
        <Banner kind="error">{deleteState.error}</Banner>
      )}

      <form action={saveAction} className="space-y-6">
        {isEdit && <input type="hidden" name="id" value={product.id} />}

        <Section title={isAr ? "البيانات" : "Identification"}>
          <Row>
            <Field id="name_ar" label={isAr ? "الاسم (عربي) *" : "Name (Arabic) *"}>
              <input
                id="name_ar"
                name="name_ar"
                required
                defaultValue={product?.name_ar ?? ""}
                dir="rtl"
                className={inputCls}
              />
            </Field>
            <Field id="name_en" label={isAr ? "الاسم (إنجليزي) *" : "Name (English) *"}>
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
              label={isAr ? "الرابط (Slug) *" : "Slug *"}
              hint={
                isAr
                  ? "بيتعبّى تلقائي من الاسم الإنجليزي. حروف صغيرة وأرقام وشرطات فقط."
                  : "Auto-fills from English name. URL-safe (a-z, 0-9, single dashes)."
              }
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
            <Field id="collection_id" label={isAr ? "المجموعة" : "Collection"}>
              <select
                id="collection_id"
                name="collection_id"
                defaultValue={product?.collection_id ?? ""}
                className={inputCls}
              >
                <option value="">{isAr ? "(بدون)" : "(none)"}</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name_ar} · {c.name_en}
                  </option>
                ))}
              </select>
            </Field>
          </Row>
        </Section>

        <Section title={isAr ? "الوصف" : "Descriptions"}>
          <Row>
            <Field id="description_ar" label={isAr ? "الوصف (عربي)" : "Description (Arabic)"}>
              <textarea
                id="description_ar"
                name="description_ar"
                dir="rtl"
                rows={4}
                defaultValue={product?.description_ar ?? ""}
                className={cn(inputCls, "resize-y")}
              />
            </Field>
            <Field id="description_en" label={isAr ? "الوصف (إنجليزي)" : "Description (English)"}>
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

        <Section title={isAr ? "التسعير" : "Pricing"}>
          <Row>
            <Field
              id="base_price"
              label={isAr ? "السعر الأساسي (ج.م) *" : "Base price (EGP) *"}
              error={fieldErrors.base_price}
            >
              <NumericInput
                id="base_price"
                name="base_price"
                required
                defaultValue={product?.base_price ?? ""}
                placeholder="مثال: 1299"
                className={cn(inputCls, "font-mono")}
              />
            </Field>
            <Field
              id="sale_price"
              label={isAr ? "سعر الخصم (ج.م)" : "Sale price (EGP)"}
              hint={
                isAr
                  ? "اتركه فاضي لو مفيش خصم. لازم يكون أقل من السعر الأساسي."
                  : "Leave blank for no sale. Must be lower than base price."
              }
              error={fieldErrors.sale_price}
            >
              <NumericInput
                id="sale_price"
                name="sale_price"
                defaultValue={product?.sale_price ?? ""}
                placeholder="مثال: 999 (اتركه فاضي لو مفيش خصم)"
                className={cn(inputCls, "font-mono")}
              />
            </Field>
          </Row>
          <Row>
            <Field
              id="store_price"
              label={isAr ? "سعر المحل (اختياري)" : "Store price (optional)"}
              hint={
                isAr
                  ? "اتركه فاضي لو نفس سعر الموقع. هيُستخدم فقط عند البيع من نقطة البيع (POS) — الموقع الإلكتروني مش هيتأثر."
                  : "Leave blank to use the website price in-store too. Applied ONLY at POS — the storefront never reads this field."
              }
              error={fieldErrors.store_price}
            >
              <NumericInput
                id="store_price"
                name="store_price"
                defaultValue={product?.store_price ?? ""}
                placeholder={
                  isAr ? "مثال: 1100 (للزبون اللي بيشتري من المحل)" : "e.g. 1100 (walk-in price)"
                }
                className={cn(inputCls, "font-mono")}
              />
            </Field>
          </Row>
        </Section>

        <Section
          title={isAr ? "المواصفات" : "Specifications"}
          hint={
            isAr
              ? "اضغط على أي حقل لتظهر القيم اللي بنستخدمها مع باقي المنتجات، أو اكتب قيمة جديدة عادي."
              : "Tap any field to see values already used on other products, or type a brand-new value."
          }
        >
          <Row>
            <Field id="material_type" label={isAr ? "نوع الخامة" : "Material type"}>
              <SuggestInput
                id="material_type"
                name="material_type"
                defaultValue={product?.material_type ?? ""}
                suggestions={sug.material_type}
                isAr={isAr}
                className={inputCls}
              />
            </Field>
            <Field id="wheel_type" label={isAr ? "نوع العجلات" : "Wheel type"}>
              <SuggestInput
                id="wheel_type"
                name="wheel_type"
                defaultValue={product?.wheel_type ?? ""}
                suggestions={sug.wheel_type}
                isAr={isAr}
                className={inputCls}
              />
            </Field>
          </Row>
          <Row>
            <Field id="lock_type" label={isAr ? "نوع القفل" : "Lock type"}>
              <SuggestInput
                id="lock_type"
                name="lock_type"
                defaultValue={product?.lock_type ?? ""}
                suggestions={sug.lock_type}
                isAr={isAr}
                className={inputCls}
              />
            </Field>
            <Field
              id="dimensions"
              label={isAr ? "الأبعاد" : "Dimensions"}
              hint={
                isAr
                  ? "نص حر، مثال: 44سم × 29.5سم × 23.5سم"
                  : "Free-form, e.g. 44cm × 29.5cm × 23.5cm"
              }
            >
              <SuggestInput
                id="dimensions"
                name="dimensions"
                defaultValue={product?.dimensions ?? ""}
                suggestions={sug.dimensions}
                isAr={isAr}
                className={inputCls}
              />
            </Field>
          </Row>
          <Row>
            <Field
              id="weight_kg"
              label={isAr ? "الوزن (كجم)" : "Weight (kg)"}
              error={fieldErrors.weight_kg}
            >
              <NumericInput
                id="weight_kg"
                name="weight_kg"
                defaultValue={product?.weight_kg ?? ""}
                placeholder="مثال: 2.5"
                className={cn(inputCls, "font-mono")}
              />
            </Field>
            <Field
              id="laptop_inches"
              label={isAr ? "مقاس اللاب توب (بوصة)" : "Laptop fit (inches)"}
              error={fieldErrors.laptop_inches}
            >
              <NumericInput
                id="laptop_inches"
                name="laptop_inches"
                defaultValue={product?.laptop_inches ?? ""}
                placeholder="مثال: 15.6"
                className={cn(inputCls, "font-mono")}
              />
            </Field>
          </Row>
          <Row>
            <Field
              id="capacity_liters"
              label={isAr ? "السعة (لتر)" : "Capacity (liters)"}
              error={fieldErrors.capacity_liters}
            >
              <NumericInput
                id="capacity_liters"
                name="capacity_liters"
                defaultValue={product?.capacity_liters ?? ""}
                placeholder="مثال: 30"
                className={cn(inputCls, "font-mono")}
              />
            </Field>
            <Field id="flags" label={isAr ? "خصائص" : "Flags"}>
              <div className="flex flex-wrap gap-3 pt-2">
                <Checkbox
                  name="is_water_resistant"
                  defaultChecked={product?.is_water_resistant ?? false}
                  label={isAr ? "مقاوم للماء" : "Water-resistant"}
                />
                <Checkbox
                  name="is_expandable"
                  defaultChecked={product?.is_expandable ?? false}
                  label={isAr ? "قابل للتوسعة" : "Expandable"}
                />
              </div>
            </Field>
          </Row>
        </Section>

        <Section title={isAr ? "العرض" : "Display"}>
          <Row>
            <Field id="image_fit" label={isAr ? "طريقة عرض الصورة" : "Image fit"}>
              <Radios
                name="image_fit"
                value={product?.image_fit ?? "cover"}
                options={[
                  {
                    value: "cover",
                    label: isAr ? "تغطية (قص لملء الإطار)" : "Cover (crop to fill)",
                  },
                  {
                    value: "contain",
                    label: isAr ? "احتواء (هامش حول الصورة)" : "Contain (letterbox)",
                  },
                ]}
              />
            </Field>
            <Field id="image_aspect" label={isAr ? "نسبة الصورة" : "Image aspect"}>
              <Radios
                name="image_aspect"
                value={product?.image_aspect ?? "square"}
                options={[
                  { value: "square", label: isAr ? "مربع" : "Square" },
                  { value: "landscape", label: isAr ? "أفقي" : "Landscape" },
                  { value: "portrait", label: isAr ? "طولي" : "Portrait" },
                ]}
              />
            </Field>
          </Row>
          <Row>
            <Field id="visibility" label={isAr ? "الظهور" : "Visibility"}>
              <div className="flex flex-col gap-2 pt-2">
                <Checkbox
                  name="is_active"
                  defaultChecked={product?.is_active ?? true}
                  label={
                    isAr
                      ? "مفعّل على الموقع (ظاهر في الكتالوج)"
                      : "Active on website (visible in /catalog)"
                  }
                />
                <Checkbox
                  name="show_in_store"
                  defaultChecked={product?.show_in_store ?? true}
                  label={
                    isAr
                      ? "متاح في المحل (نقطة البيع)"
                      : "Available at POS (physical store)"
                  }
                />
              </div>
            </Field>
            <Field
              id="tags"
              label={isAr ? "وسوم" : "Tags"}
              hint={
                isAr
                  ? `مفصولة بفواصل، مثال: best-seller, set${
                      sug.tags.length > 0
                        ? ` · موجود حالياً: ${sug.tags.slice(0, 6).join("، ")}`
                        : ""
                    }`
                  : `Comma-separated, e.g. best-seller, set${
                      sug.tags.length > 0
                        ? ` · already in use: ${sug.tags.slice(0, 6).join(", ")}`
                        : ""
                    }`
              }
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

        <Section title={isAr ? "الصور" : "Images"}>
          <ImageManager
            productId={product?.id}
            initial={product?.images ?? []}
            locale={locale}
          />
        </Section>

        <div className="flex items-center justify-end border-t border-[var(--color-border)] pt-4">
          <SaveButton isEdit={isEdit} isAr={isAr} />
        </div>
      </form>

      {/* Delete in a sibling form (NOT nested) so HTML stays valid. */}
      {isEdit && (
        <form action={deleteAction} className="border-t border-[var(--color-border)] pt-4">
          <input type="hidden" name="id" value={product.id} />
          <DeleteButton isAr={isAr} />
        </form>
      )}
    </div>
  );
}

// ─── Submit / Delete buttons with useFormStatus ─────────────────────
function SaveButton({ isEdit, isAr }: { isEdit: boolean; isAr: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-full bg-brass-500 px-6 py-2.5 text-sm font-semibold text-navy-900 transition hover:bg-brass-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {isEdit
        ? isAr
          ? "حفظ التعديلات"
          : "Save changes"
        : isAr
          ? "إنشاء المنتج"
          : "Create product"}
    </button>
  );
}

function DeleteButton({ isAr }: { isAr: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (
          !confirm(
            isAr
              ? "تأكيد حذف المنتج؟ لو فيه طلبات أو قوائم رغبات بتشيره الحذف هيتمنع."
              : "Delete this product? Orders or wishlists referencing it will block the delete.",
          )
        )
          e.preventDefault();
      }}
      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-4 py-2 text-xs font-medium text-[var(--color-text-secondary)] transition hover:border-[var(--color-error)] hover:text-[var(--color-error)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-error)] focus-visible:ring-offset-2 disabled:opacity-60"
    >
      {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      <Trash2 className="h-3.5 w-3.5" />
      {isAr ? "حذف المنتج" : "Delete product"}
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
  hint,
  children,
}: {
  title: string;
  /** Optional one-liner under the section title — used by the specs
      section to surface the new combobox autocomplete behaviour. */
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5">
      <h2 className="font-display text-lg text-[var(--color-text)]">
        {title}
      </h2>
      {hint && (
        <p className="mb-4 mt-1 text-[11px] text-[var(--color-text-secondary)]">
          {hint}
        </p>
      )}
      {!hint && <div className="mb-4" />}
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
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  /** Inline validation message shown in red beneath the field. */
  error?: string;
  children: React.ReactNode;
}) {
  // Hint + error sit OUTSIDE the <label> so screen readers don't read
  // them as part of the accessible name on every focus.
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy =
    [errorId, hintId].filter(Boolean).join(" ") || undefined;
  return (
    <div className="block text-sm">
      <label
        htmlFor={id}
        className="mb-1 block text-xs uppercase tracking-wider text-[var(--color-text-secondary)]"
      >
        {label}
      </label>
      <div aria-describedby={describedBy}>{children}</div>
      {error && (
        <p
          id={errorId}
          role="alert"
          dir="rtl"
          className="mt-1 text-[12px] text-[var(--color-error)]"
        >
          {error}
        </p>
      )}
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
// Numeric text input that mimics number-type semantics WITHOUT the
// ugly spinner arrows. inputMode="decimal" still gives mobile users
// the numeric keypad; the keydown allowlist blocks letters/symbols
// while preserving navigation, editing, and clipboard shortcuts.
const ALLOWED_NUMERIC_KEYS = new Set([
  "Backspace",
  "Delete",
  "Tab",
  "Enter",
  "Escape",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
]);
function onNumericKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
  if (e.ctrlKey || e.metaKey) return;
  if (ALLOWED_NUMERIC_KEYS.has(e.key)) return;
  if (/^[0-9.,]$/.test(e.key)) return;
  e.preventDefault();
}
function NumericInput({
  id,
  name,
  required,
  defaultValue,
  placeholder,
  className,
}: {
  id: string;
  name: string;
  required?: boolean;
  defaultValue?: string | number;
  placeholder?: string;
  className?: string;
}) {
  return (
    <input
      id={id}
      name={name}
      type="text"
      inputMode="decimal"
      pattern="[0-9]*\.?[0-9]*"
      required={required}
      defaultValue={defaultValue}
      placeholder={placeholder}
      onKeyDown={onNumericKeyDown}
      className={className}
    />
  );
}

const inputCls =
  "w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:border-[var(--color-accent)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40";
