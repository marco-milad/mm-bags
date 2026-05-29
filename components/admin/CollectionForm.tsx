import Link from "next/link";
import type { Collection } from "@/lib/supabase/types";

export function CollectionForm({
  action,
  initial,
  parentOptions,
}: {
  /** Server action bound to the form (use bind() for update to inject the id) */
  action: (formData: FormData) => Promise<void>;
  initial?: Partial<Collection>;
  parentOptions: { slug: string; name_en: string }[];
}) {
  const v = (k: keyof Collection) => (initial?.[k] as string | number | null | undefined) ?? "";

  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Name (Arabic)" name="name_ar" defaultValue={String(v("name_ar"))} required />
        <Field label="Name (English)" name="name_en" defaultValue={String(v("name_en"))} required />
        <Field
          label="Slug (lowercase, kebab-case)"
          name="slug"
          defaultValue={String(v("slug"))}
          placeholder="laptop-bags"
          required
        />
        <Field
          label="Sort order"
          name="sort_order"
          type="number"
          defaultValue={String(initial?.sort_order ?? 0)}
        />
      </div>

      <Field
        label="Description (Arabic)"
        name="description_ar"
        textarea
        defaultValue={String(v("description_ar"))}
      />
      <Field
        label="Description (English)"
        name="description_en"
        textarea
        defaultValue={String(v("description_en"))}
      />

      <div className="grid gap-5 md:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Parent (optional)</span>
          <select
            name="parent_slug"
            defaultValue={String(v("parent_slug"))}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm"
          >
            <option value="">— None (top-level) —</option>
            {parentOptions.map((opt) => (
              <option key={opt.slug} value={opt.slug}>
                {opt.name_en} ({opt.slug})
              </option>
            ))}
          </select>
        </label>
        <Field
          label="Cover image URL (optional)"
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
        <span>Active (visible on the storefront)</span>
      </label>

      <div className="flex items-center gap-3 border-t border-[var(--color-border)] pt-5">
        <button
          type="submit"
          className="rounded-full bg-[var(--color-primary)] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-primary-light)]"
        >
          Save collection
        </button>
        <Link
          href="/admin/collections"
          className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
        >
          Cancel
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
