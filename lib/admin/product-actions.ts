"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/auth";

/**
 * Server actions for /admin/products and its new/edit pages.
 *
 * Every exported action calls `requireAdmin()` first — Server Actions
 * are addressable POST endpoints not gated by the layout, so the
 * auth check has to be inline.
 *
 * Error contract: actions called with `<form action>` and a useActionState
 * binding return a typed result; the bare formData-only actions
 * (toggles, deletes) return void and rely on revalidatePath. Adversarial
 * review (this session) flagged silent failures across the board —
 * the saveProduct / saveVariant paths now return error objects so the
 * UI can surface validation, duplicate-slug, FK, and unique-SKU
 * problems instead of swallowing them.
 */

// ─── Shared utilities ───────────────────────────────────────────────
const SUPABASE_PRODUCTS_PREFIX =
  (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "") +
  "/storage/v1/object/public/products/";

/** Generous defence-in-depth cap on persisted images. The ImageManager
 *  UI enforces a smaller limit on NEW uploads; the higher number here
 *  exists so legacy rows that predate the UI cap (e.g. a 14-image
 *  Shopify import) don't get silently truncated when an admin saves a
 *  field unrelated to images. */
const MAX_IMAGES_PERSIST = 30;

/**
 * Validate the image list submitted from the ImageManager hidden field
 * and decide what (if anything) to write back to the row.
 *
 * Returns:
 *   - `undefined` → leave the existing `images[]` untouched. Used when
 *     the form omitted the field entirely, the JSON was malformed, or
 *     the parsed payload wasn't an array. NEVER overwrite the row in
 *     these cases — the historical bug here was a strict URL filter
 *     stripping every legacy entry and falling through to `[]`, which
 *     destroyed several products' images on a routine field save.
 *   - `[]` → admin deliberately cleared every image via the UI. Honour it.
 *   - `string[]` → validated list. A URL is kept if it matches the
 *     bucket origin OR it was already in the row's `images[]` (so
 *     legacy off-bucket URLs from older imports survive a re-save).
 *
 * `existing` is the row's current `images[]`. For new-product inserts
 * pass `[]` — there's nothing legacy to preserve.
 */
// NOT exported — `"use server"` files can only export async actions.
// Keep this helper module-internal; saveProduct + reorderProductImages
// are the only callers anyway.
function resolveImagesForSave(
  rawJson: string | undefined,
  existing: ReadonlyArray<string>,
): string[] | undefined {
  if (rawJson === undefined) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return undefined;
  }
  if (!Array.isArray(parsed)) return undefined;
  if (parsed.length === 0) return [];

  const existingSet = new Set<string>(existing);
  return parsed
    .filter(
      (u): u is string =>
        typeof u === "string" &&
        u.length > 0 &&
        u.length <= 2048 &&
        (existingSet.has(u) ||
          !SUPABASE_PRODUCTS_PREFIX ||
          u.startsWith(SUPABASE_PRODUCTS_PREFIX)),
    )
    .slice(0, MAX_IMAGES_PERSIST);
}

/** Treat blank strings as "absent" so optional numeric fields can be
    cleared back to null instead of silently saving 0. */
const optionalNumber = (validator: z.ZodType<number>) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    validator.optional(),
  );

const optionalTrimmedString = (max = 200) =>
  z.preprocess(
    (v) =>
      typeof v === "string" && v.trim() === ""
        ? undefined
        : typeof v === "string"
          ? v.trim()
          : v,
    z.string().max(max).optional(),
  );

/** Tight slug regex — no leading/trailing dashes, no doubles. */
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const HEX_REGEX = /^#[0-9a-fA-F]{6}$/;
/** Default the color picker fires when no color has been chosen. We
    treat this exact string as "no color" so an untouched picker can
    round-trip null. The trade-off: admins genuinely picking pure
    black get coerced to no-colour. We document the limitation in
    the variant UI's tooltip. */
const COLOR_HEX_DEFAULT_SENTINEL = "#000000";

// ─── Product schema ─────────────────────────────────────────────────
// Numeric bounds also guard the DB columns from overflow: products
// uses numeric(12,2) for prices, numeric(6,2) for weight, etc.
// (see migration `widen_numeric_columns_for_overflow_fix`).
const productSchema = z
  .object({
    id: z.string().optional(),
    slug: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .regex(SLUG_REGEX, "Slug must use lowercase letters, digits, single dashes (no leading/trailing dash)"),
    collection_id: optionalTrimmedString(80),
    name_ar: z.string().trim().min(1).max(200),
    name_en: z.string().trim().min(1).max(200),
    description_ar: optionalTrimmedString(4000),
    description_en: optionalTrimmedString(4000),
    base_price: z.coerce
      .number()
      .min(1, "السعر لازم يكون من 1 جنيه على الأقل")
      .max(999999, "السعر لازم يكون أقل من 999,999 جنيه"),
    sale_price: optionalNumber(
      z.coerce.number().max(999999, "سعر التخفيض لازم يكون أقل من 999,999 جنيه"),
    ),
    material_type: optionalTrimmedString(60),
    wheel_type: optionalTrimmedString(60),
    lock_type: optionalTrimmedString(60),
    dimensions: optionalTrimmedString(100),
    weight_kg: optionalNumber(
      z.coerce
        .number()
        .min(0.1, "الوزن لازم يكون من 0.1 كجم على الأقل")
        .max(999, "الوزن لازم يكون أقل من 999 كجم"),
    ),
    laptop_inches: optionalNumber(
      z.coerce
        .number()
        .min(10, "مقاس اللاب لازم يكون من 10 بوصة على الأقل")
        .max(20, "مقاس اللاب لازم يكون أقل من 20 بوصة"),
    ),
    capacity_liters: optionalNumber(
      z.coerce
        .number()
        .min(1, "السعة لازم تكون من 1 لتر على الأقل")
        .max(999, "السعة لازم تكون أقل من 999 لتر"),
    ),
    is_water_resistant: z.coerce.boolean().optional(),
    is_expandable: z.coerce.boolean().optional(),
    image_fit: z.enum(["cover", "contain"]).optional(),
    image_aspect: z.enum(["square", "landscape", "portrait"]).optional(),
    is_active: z.coerce.boolean().optional(),
    show_in_store: z.coerce.boolean().optional(),
    tags: z.string().optional(),
    images_json: z.string().max(20_000).optional(),
  })
  .refine(
    (d) =>
      d.sale_price === undefined ||
      d.sale_price === 0 ||
      d.sale_price < d.base_price,
    {
      message: "سعر التخفيض لازم يكون أقل من السعر الأصلي",
      path: ["sale_price"],
    },
  );

export type ProductActionResult =
  | { ok: true; id?: string }
  | {
      ok: false;
      error: string;
      /** Per-field error messages keyed by Zod path (e.g. "base_price").
          The form renders these inline under the matching <Field>. */
      fieldErrors?: Record<string, string>;
    };

/**
 * Create or update a product.
 *
 * Form action signature: `(prev: unknown, formData: FormData)` so
 * the page can wire it through `useActionState`. The previous-state
 * arg is unused.
 */
export async function saveProduct(
  _prev: unknown,
  formData: FormData,
): Promise<ProductActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Not authorised" };
  }

  // Hand-build the input object. We don't trust an iterate-keys loop
  // because FormData.get() returns null for missing keys, and many
  // optional zod fields would reject null (only undefined is treated
  // as "absent").
  const raw: Record<string, unknown> = {
    id: formData.get("id") ?? undefined,
    slug: formData.get("slug") ?? "",
    collection_id: formData.get("collection_id") ?? undefined,
    name_ar: formData.get("name_ar") ?? "",
    name_en: formData.get("name_en") ?? "",
    description_ar: formData.get("description_ar") ?? undefined,
    description_en: formData.get("description_en") ?? undefined,
    base_price: formData.get("base_price") ?? "",
    sale_price: formData.get("sale_price") ?? undefined,
    material_type: formData.get("material_type") ?? undefined,
    wheel_type: formData.get("wheel_type") ?? undefined,
    lock_type: formData.get("lock_type") ?? undefined,
    dimensions: formData.get("dimensions") ?? undefined,
    weight_kg: formData.get("weight_kg") ?? undefined,
    laptop_inches: formData.get("laptop_inches") ?? undefined,
    capacity_liters: formData.get("capacity_liters") ?? undefined,
    image_fit: formData.get("image_fit") ?? undefined,
    image_aspect: formData.get("image_aspect") ?? undefined,
    tags: formData.get("tags") ?? undefined,
    images_json: formData.get("images_json") ?? undefined,
  };
  // Checkboxes: HTML omits unchecked entirely. Treat any present
  // value as true (robust against future explicit `value=` use).
  for (const flag of [
    "is_water_resistant",
    "is_expandable",
    "is_active",
    "show_in_store",
  ] as const) {
    raw[flag] = formData.get(flag) != null ? "true" : "false";
  }

  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) {
    // Collect first error per field so the UI can render inline
    // messages. Keep the top-level `error` string as the first issue
    // so the existing banner still surfaces something useful for
    // form-wide problems (e.g. when zod refine targets a field
    // not currently rendered).
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !(key in fieldErrors)) {
        fieldErrors[key] = issue.message;
      }
    }
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
      fieldErrors,
    };
  }
  const { id, images_json, tags, collection_id, ...rest } = parsed.data;

  const tagList = (tags ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const admin = getSupabaseAdminClient();

  // Pull the row's CURRENT images[] before validating the submission.
  // The validator needs them as an allow-list so legacy off-bucket URLs
  // (e.g. cdn.shopify.com from the original CK / Milano imports) aren't
  // silently dropped on a re-save. New inserts get an empty existing set.
  let existingImages: string[] = [];
  if (id) {
    const { data: imgRow } = await admin
      .from("products")
      .select("images")
      .eq("id", id)
      .maybeSingle();
    existingImages = (imgRow?.images as string[] | null) ?? [];
  }
  const resolvedImages = resolveImagesForSave(images_json, existingImages);

  const basePayload = {
    ...rest,
    collection_id: collection_id || null,
    tags: tagList,
    // sale_price = 0 means "no sale" by convention; null it out.
    sale_price:
      rest.sale_price && rest.sale_price > 0 ? rest.sale_price : null,
    // Optional numerics treat blank as null (via preprocess) and 0 as
    // a real value — but for the body specs we want explicit 0 to
    // become null too (a 0 kg weight means "unset", not "0 kg").
    weight_kg: rest.weight_kg && rest.weight_kg > 0 ? rest.weight_kg : null,
    laptop_inches:
      rest.laptop_inches && rest.laptop_inches > 0 ? rest.laptop_inches : null,
    capacity_liters:
      rest.capacity_liters && rest.capacity_liters > 0
        ? rest.capacity_liters
        : null,
    description_ar: rest.description_ar || null,
    description_en: rest.description_en || null,
    material_type: rest.material_type || null,
    wheel_type: rest.wheel_type || null,
    lock_type: rest.lock_type || null,
    dimensions: rest.dimensions || null,
    updated_at: new Date().toISOString(),
  };

  if (id) {
    // UPDATE path: only touch `images` when the validator returned a
    // value. `undefined` means the form omitted the field or sent
    // malformed JSON — preserve whatever's already in the row instead
    // of stomping it with an empty array.
    const updatePayload =
      resolvedImages !== undefined
        ? { ...basePayload, images: resolvedImages }
        : basePayload;

    // Fetch the OLD slug so we can revalidate both old and new
    // storefront URLs on rename.
    const { data: prevRow } = await admin
      .from("products")
      .select("slug")
      .eq("id", id)
      .maybeSingle();

    const { error } = await admin
      .from("products")
      .update(updatePayload)
      .eq("id", id);
    if (error) {
      if (error.code === "23505")
        return { ok: false, error: "Slug already in use" };
      return { ok: false, error: error.message };
    }
    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${id}/edit`);
    revalidatePath(`/ar/products/${basePayload.slug}`);
    revalidatePath(`/en/products/${basePayload.slug}`);
    if (prevRow?.slug && prevRow.slug !== basePayload.slug) {
      revalidatePath(`/ar/products/${prevRow.slug}`);
      revalidatePath(`/en/products/${prevRow.slug}`);
    }
    return { ok: true, id };
  }

  // Insert: assign the next sort_order so new products don't pile up
  // at the top of the listing alongside other zero-sort rows.
  const { data: topRow } = await admin
    .from("products")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSortOrder = ((topRow?.sort_order ?? 0) as number) + 1;

  // New product: no row exists to "preserve" — undefined collapses to [].
  const insertImages = resolvedImages ?? [];
  const { data: created, error } = await admin
    .from("products")
    .insert({ ...basePayload, images: insertImages, sort_order: nextSortOrder })
    .select("id")
    .single();
  if (error || !created) {
    if (error?.code === "23505")
      return { ok: false, error: "Slug already in use" };
    return { ok: false, error: error?.message ?? "Insert failed" };
  }
  revalidatePath("/admin/products");
  // redirect() throws NEXT_REDIRECT which a useActionState client
  // handles cleanly (it's the standard form-action pattern).
  redirect(`/admin/products/${created.id}/edit`);
}

// ─── Single-field flag toggles ──────────────────────────────────────
async function toggleFlag(
  formData: FormData,
  column: "is_active" | "show_in_store",
): Promise<void> {
  try {
    await requireAdmin();
  } catch {
    return;
  }
  const id = formData.get("id");
  if (typeof id !== "string") return;
  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from("products")
    .select(column)
    .eq("id", id)
    .maybeSingle();
  if (!data) return;
  const current = (data as Record<string, boolean>)[column];
  // Explicit branches keep the supabase-js strict insert types happy.
  if (column === "is_active") {
    await admin.from("products").update({ is_active: !current }).eq("id", id);
  } else {
    await admin
      .from("products")
      .update({ show_in_store: !current })
      .eq("id", id);
  }
  revalidatePath("/admin/products");
}

export async function toggleProductActive(formData: FormData): Promise<void> {
  await toggleFlag(formData, "is_active");
}
export async function toggleProductInStore(formData: FormData): Promise<void> {
  await toggleFlag(formData, "show_in_store");
}

// ─── Delete ─────────────────────────────────────────────────────────
export type DeleteResult = { ok: true } | { ok: false; error: string };

export async function deleteProduct(
  _prev: unknown,
  formData: FormData,
): Promise<DeleteResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Not authorised" };
  }
  const id = formData.get("id");
  if (typeof id !== "string") return { ok: false, error: "Missing id" };
  const admin = getSupabaseAdminClient();
  const { error } = await admin.from("products").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") {
      return {
        ok: false,
        error:
          "Product cannot be deleted because it has orders or wishlists. Deactivate it instead.",
      };
    }
    return { ok: false, error: error.message };
  }
  revalidatePath("/admin/products");
  redirect("/admin/products");
}

// ─── Image management ───────────────────────────────────────────────
export async function reorderProductImages(
  formData: FormData,
): Promise<void> {
  try {
    await requireAdmin();
  } catch {
    return;
  }
  const id = formData.get("id");
  const images_json = formData.get("images_json");
  if (typeof id !== "string" || typeof images_json !== "string") return;
  if (images_json.length > 20_000) return; // hard cap to dodge OOM

  const admin = getSupabaseAdminClient();
  // Fetch current images so legacy off-bucket URLs (still possibly in
  // the row from earlier imports) survive a reorder/delete pass. Same
  // allow-list logic as saveProduct().
  const { data: imgRow } = await admin
    .from("products")
    .select("images")
    .eq("id", id)
    .maybeSingle();
  const existingImages = (imgRow?.images as string[] | null) ?? [];

  const resolved = resolveImagesForSave(images_json, existingImages);
  // Reorder/delete must have an explicit list — undefined means the
  // payload was malformed, in which case we leave the row alone rather
  // than blanking it.
  if (resolved === undefined) return;

  await admin.from("products").update({ images: resolved }).eq("id", id);
  revalidatePath(`/admin/products/${id}/edit`);
}

// ─── Variant CRUD ───────────────────────────────────────────────────
const variantSchema = z.object({
  id: optionalTrimmedString(40),
  product_id: z.string().min(1),
  color_ar: optionalTrimmedString(40),
  color_en: optionalTrimmedString(40),
  color_hex: optionalTrimmedString(20),
  size_inches: optionalNumber(z.coerce.number().int().nonnegative()),
  size_label_ar: optionalTrimmedString(40),
  is_set: z.coerce.boolean().optional(),
  stock_qty: z.coerce.number().int().nonnegative(),
  price_override: optionalNumber(z.coerce.number().nonnegative()),
  sku: optionalTrimmedString(60),
});

export type VariantActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function saveVariant(
  _prev: unknown,
  formData: FormData,
): Promise<VariantActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Not authorised" };
  }
  const raw: Record<string, unknown> = {
    id: formData.get("id") ?? undefined,
    product_id: formData.get("product_id") ?? "",
    color_ar: formData.get("color_ar") ?? undefined,
    color_en: formData.get("color_en") ?? undefined,
    color_hex: formData.get("color_hex") ?? undefined,
    size_inches: formData.get("size_inches") ?? undefined,
    size_label_ar: formData.get("size_label_ar") ?? undefined,
    stock_qty: formData.get("stock_qty") ?? "",
    price_override: formData.get("price_override") ?? undefined,
    sku: formData.get("sku") ?? undefined,
    is_set: formData.get("is_set") != null ? "true" : "false",
  };
  const parsed = variantSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  const { id, ...rest } = parsed.data;

  // color_hex: native <input type="color"> always submits. We treat
  // the "use color" hidden flag's absence as null so an untouched
  // picker doesn't fabricate #000000. The flag is set by the
  // VariantsManager UI when the admin opts in.
  const colorHexFlagged = formData.get("color_hex_use") != null;
  let color_hex: string | null = null;
  if (
    colorHexFlagged &&
    rest.color_hex &&
    HEX_REGEX.test(rest.color_hex)
  ) {
    color_hex = rest.color_hex.toLowerCase();
  } else if (
    !colorHexFlagged &&
    rest.color_hex &&
    rest.color_hex.toLowerCase() !== COLOR_HEX_DEFAULT_SENTINEL &&
    HEX_REGEX.test(rest.color_hex)
  ) {
    // Backwards-compat: legacy rows without the use-flag — keep
    // anything that isn't the sentinel.
    color_hex = rest.color_hex.toLowerCase();
  }

  const payload = {
    product_id: rest.product_id,
    color_ar: rest.color_ar || null,
    color_en: rest.color_en || null,
    color_hex,
    // Treat explicit 0 as "no size" for size_inches (no size makes
    // more sense than 0-inch). Keep 0 as a real value for
    // price_override (a price-0 promo variant is legitimate).
    size_inches:
      rest.size_inches !== undefined && rest.size_inches > 0
        ? rest.size_inches
        : null,
    size_label_ar: rest.size_label_ar || null,
    is_set: rest.is_set ?? false,
    stock_qty: rest.stock_qty,
    price_override:
      rest.price_override !== undefined ? rest.price_override : null,
    sku: rest.sku || null,
  };

  const admin = getSupabaseAdminClient();
  if (id) {
    const { error } = await admin
      .from("product_variants")
      .update(payload)
      .eq("id", id);
    if (error) {
      if (error.code === "23505")
        return { ok: false, error: "SKU already in use" };
      return { ok: false, error: error.message };
    }
  } else {
    const { error } = await admin.from("product_variants").insert(payload);
    if (error) {
      if (error.code === "23505")
        return { ok: false, error: "SKU already in use" };
      return { ok: false, error: error.message };
    }
  }
  revalidatePath(`/admin/products/${rest.product_id}/edit`);
  revalidatePath("/admin/products");
  return { ok: true };
}

export async function deleteVariant(formData: FormData): Promise<void> {
  try {
    await requireAdmin();
  } catch {
    return;
  }
  const id = formData.get("id");
  const product_id = formData.get("product_id");
  if (typeof id !== "string") return;
  const admin = getSupabaseAdminClient();
  await admin.from("product_variants").delete().eq("id", id);
  if (typeof product_id === "string") {
    revalidatePath(`/admin/products/${product_id}/edit`);
  }
  revalidatePath("/admin/products");
}
