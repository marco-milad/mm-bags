import Link from "next/link";
import type { Collection } from "@/lib/supabase/types";
import type { AdminLocale } from "@/lib/admin/locale";

export function CollectionForm({
  action,
  initial,
  parentOptions,
  locale,
}: {
  /** Server action bound to the form (use bind() for update to inject the id) */
  action: (formData: FormData) => Promise<void>;
  initial?: Partial<Collection>;
  parentOptions: { slug: string; name_en: string }[];
  locale: AdminLocale;
}) {
  const isAr = locale === "ar";
  const v = (k: keyof Collection) => (initial?.[k] as string | number | null | undefined) ?? "";

  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <Field
          label={isAr ? "الاسم (عربي)" : "Name (Arabic)"}
          name="name_ar"
          defaultValue={String(v("name_ar"))}
          required
        />
        <Field
          label={isAr ? "الاسم (إنجليزي)" : "Name (English)"}
          name="name_en"
          defaultValue={String(v("name_en"))}
          required
        />
        <Field
          label={isAr ? "السلاج (أحرف صغيرة بشرطات)" : "Slug (lowercase, kebab-case)"}
          name="slug"
          defaultValue={String(v("slug"))}
          placeholder="laptop-bags"
          required
        />
        <Field
          label={isAr ? "ترتيب العرض" : "Sort order"}
          name="sort_order"
          type="number"
          defaultValue={String(initial?.sort_order ?? 0)}
        />
      </div>

      <Field
        label={isAr ? "الوصف (عربي)" : "Description (Arabic)"}
        name="description_ar"
        textarea
        defaultValue={String(v("description_ar"))}
      />
      <Field
        label={isAr ? "الوصف (إنجليزي)" : "Description (English)"}
        name="description_en"
        textarea
        defaultValue={String(v("description_en"))}
      />

      <div className="grid gap-5 md:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">
            {isAr ? "الأب (اختياري)" : "Parent (optional)"}
          </span>
          <select
            name="parent_slug"
            defaultValue={String(v("parent_slug"))}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm"
          >
            <option value="">
              {isAr ? "— بدون (تشكيلة رئيسية) —" : "— None (top-level) —"}
            </option>
            {parentOptions.map((opt) => (
              <option key={opt.slug} value={opt.slug}>
                {opt.name_en} ({opt.slug})
              </option>
            ))}
          </select>
        </label>
        <Field
          label={isAr ? "رابط صورة الغلاف (اختياري)" : "Cover image URL (optional)"}
          name="cover_image"
          defaultValue={String(v("cover_image"))}
          placeholder="https://..."
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={initial?.is_active ?? true}
          className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-primary)]"
        />
        <span>
          {isAr ? "ظاهرة (تتعرض في المتجر)" : "Active (visible on the storefront)"}
        </span>
      </label>

      <div className="flex items-center gap-3 border-t border-[var(--color-border)] pt-5">
        <button
          type="submit"
          className="rounded-full bg-[var(--color-primary)] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-primary-light)]"
        >
          {isAr ? "حفظ التشكيلة" : "Save collection"}
        </button>
        <Link
          href="/admin/collections"
          className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
        >
          {isAr ? "إلغاء" : "Cancel"}
        </Link>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue = "",
  placeholder,
  type = "text",
  required = false,
  textarea = false,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  textarea?: boolean;
}) {
  const cls =
    "rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]";
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {textarea ? (
        <textarea
          name={name}
          defaultValue={defaultValue}
          placeholder={placeholder}
          rows={3}
          className={`${cls} resize-none`}
        />
      ) : (
        <input
          name={name}
          type={type}
          defaultValue={defaultValue}
          placeholder={placeholder}
          required={required}
          className={cls}
        />
      )}
    </label>
  );
}
