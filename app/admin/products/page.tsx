import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import {
  listAdminProducts,
  listAllCollections,
  type ListAdminProductFilters,
  type StockStatus,
} from "@/lib/queries/admin-products";
import {
  toggleProductActive,
  toggleProductInStore,
} from "@/lib/admin/product-actions";
import { getAdminLocale } from "@/lib/admin/locale";
import { cn, formatPriceEGP } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProductsPage({
  searchParams,
}: PageProps<"/admin/products">) {
  const locale = await getAdminLocale();
  const isAr = locale === "ar";

  const sp = await searchParams;
  const filters: ListAdminProductFilters = {
    collectionId:
      typeof sp?.collection === "string" ? sp.collection : undefined,
    isActive:
      sp?.active === "true" || sp?.active === "false"
        ? (sp.active as "true" | "false")
        : undefined,
    stock:
      sp?.stock === "out" || sp?.stock === "low" || sp?.stock === "ok"
        ? (sp.stock as StockStatus)
        : undefined,
    q: typeof sp?.q === "string" ? sp.q : undefined,
  };

  const [products, collections] = await Promise.all([
    listAdminProducts(filters),
    listAllCollections(),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-[var(--color-text)]">
            {isAr ? "المنتجات" : "Products"}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {isAr
              ? "المخزون والظهور وإدارة الفاريانتس."
              : "Inventory + visibility + variant management."}
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="inline-flex items-center gap-1.5 rounded-full bg-brass-500 px-4 py-2 text-sm font-semibold text-navy-900 transition hover:bg-brass-600"
        >
          <Plus className="h-4 w-4" />
          {isAr ? "منتج جديد" : "New product"}
        </Link>
      </header>

      {/* Filters */}
      <form
        action="/admin/products"
        className="flex flex-wrap items-end gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-3"
      >
        <label className="text-xs">
          <span className="mb-1 block uppercase tracking-wider text-[var(--color-text-secondary)]">
            {isAr ? "بحث" : "Search"}
          </span>
          <input
            type="search"
            name="q"
            defaultValue={filters.q ?? ""}
            placeholder={isAr ? "الاسم أو الرابط" : "Name or slug"}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm focus:border-[var(--color-accent)] focus:outline-none"
          />
        </label>
        <label className="text-xs">
          <span className="mb-1 block uppercase tracking-wider text-[var(--color-text-secondary)]">
            {isAr ? "المجموعة" : "Collection"}
          </span>
          <select
            name="collection"
            defaultValue={filters.collectionId ?? ""}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
          >
            <option value="">{isAr ? "الكل" : "All"}</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name_ar} · {c.name_en}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          <span className="mb-1 block uppercase tracking-wider text-[var(--color-text-secondary)]">
            {isAr ? "الحالة" : "Active"}
          </span>
          <select
            name="active"
            defaultValue={filters.isActive ?? ""}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
          >
            <option value="">{isAr ? "أي" : "Any"}</option>
            <option value="true">{isAr ? "مفعّل" : "Active"}</option>
            <option value="false">{isAr ? "متوقف" : "Inactive"}</option>
          </select>
        </label>
        <label className="text-xs">
          <span className="mb-1 block uppercase tracking-wider text-[var(--color-text-secondary)]">
            {isAr ? "المخزون" : "Stock"}
          </span>
          <select
            name="stock"
            defaultValue={filters.stock ?? ""}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
          >
            <option value="">{isAr ? "أي" : "Any"}</option>
            <option value="ok">{isAr ? "متوفر" : "In stock"}</option>
            <option value="low">{isAr ? "منخفض" : "Low"}</option>
            <option value="out">{isAr ? "نفد" : "Out"}</option>
          </select>
        </label>
        <button
          type="submit"
          className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white"
        >
          {isAr ? "تطبيق" : "Apply"}
        </button>
        <Link
          href="/admin/products"
          className="text-xs text-[var(--color-text-secondary)] underline-offset-4 hover:underline"
        >
          {isAr ? "إعادة تعيين" : "Reset"}
        </Link>
      </form>

      <p className="text-xs text-[var(--color-text-secondary)]">
        {isAr
          ? `${products.length} منتج`
          : `${products.length} product${products.length === 1 ? "" : "s"}`}
      </p>

      {/* listAdminProducts caps at 1000 rows. Surface the truncation so
          the admin doesn't think 100% of the catalog is visible. */}
      {products.length >= 1000 && (
        <p
          role="alert"
          className="rounded-md border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 px-3 py-2 text-xs text-[var(--color-warning)]"
        >
          {isAr
            ? "بنعرض أول 1000 منتج — استخدم فلتر علشان تشوف الباقي."
            : "Showing first 1000 products — apply a filter to see the rest."}
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-[var(--color-surface)] text-[var(--color-text-secondary)]">
            <tr>
              <Th aria-label={isAr ? "صورة مصغّرة" : "Thumbnail"} />
              <Th>{isAr ? "الاسم" : "Name"}</Th>
              <Th>{isAr ? "المجموعة" : "Collection"}</Th>
              <Th className="text-end">{isAr ? "السعر" : "Price"}</Th>
              <Th className="text-end">{isAr ? "المخزون" : "Stock"}</Th>
              <Th>{isAr ? "المحل" : "Store"}</Th>
              <Th>{isAr ? "أونلاين" : "Online"}</Th>
              <Th aria-label={isAr ? "إجراءات" : "Actions"} />
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const onSale =
                p.sale_price !== null && p.sale_price < p.base_price;
              return (
                <tr
                  key={p.id}
                  className="border-t border-[var(--color-border)] hover:bg-[var(--color-surface)]/50"
                >
                  <td className="px-3 py-2">
                    <span className="relative block h-10 w-10 overflow-hidden rounded-md bg-[var(--color-surface-2)]">
                      {p.images[0] && (
                        <Image
                          src={p.images[0]}
                          alt=""
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      )}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/admin/products/${p.id}/edit`}
                      className="text-[var(--color-text)] hover:underline"
                    >
                      {p.name_ar}
                    </Link>
                    <p className="text-[11px] text-[var(--color-text-secondary)]">
                      {p.name_en}{" "}
                      <span className="font-mono">· /{p.slug}</span>
                    </p>
                  </td>
                  <td className="px-3 py-2 text-[12px] text-[var(--color-text-secondary)]">
                    {p.collection_name ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-end">
                    <p className="font-mono text-sm font-semibold text-[var(--color-primary)]">
                      {formatPriceEGP(p.sale_price ?? p.base_price)}
                    </p>
                    {onSale && (
                      <p className="font-mono text-[10px] text-[var(--color-text-secondary)] line-through">
                        {formatPriceEGP(p.base_price)}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-2 text-end">
                    <StockBadge qty={p.total_stock} />
                  </td>
                  <td className="px-3 py-2">
                    <form action={toggleProductInStore}>
                      <input type="hidden" name="id" value={p.id} />
                      <ToggleSwitch
                        checked={p.show_in_store}
                        label={isAr ? "متاح في المحل" : "Available at POS"}
                        isAr={isAr}
                      />
                    </form>
                  </td>
                  <td className="px-3 py-2">
                    <form action={toggleProductActive}>
                      <input type="hidden" name="id" value={p.id} />
                      <ToggleSwitch
                        checked={p.is_active}
                        label={isAr ? "ظاهر على الموقع" : "Visible on website"}
                        isAr={isAr}
                      />
                    </form>
                  </td>
                  <td className="px-3 py-2 text-end">
                    <Link
                      href={`/admin/products/${p.id}/edit`}
                      className="text-xs text-[var(--color-primary)] underline-offset-4 hover:underline"
                    >
                      {isAr ? "تعديل" : "Edit"}
                    </Link>
                  </td>
                </tr>
              );
            })}
            {products.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-xs text-[var(--color-text-secondary)]">
                  {isAr
                    ? "مفيش منتجات مطابقة للفلاتر الحالية."
                    : "No products match the current filters."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StockBadge({ qty }: { qty: number }) {
  const cls =
    qty === 0
      ? "bg-[var(--color-error)]/15 text-[var(--color-error)]"
      : qty <= 10
        ? "bg-[var(--color-warning)]/15 text-[var(--color-warning)]"
        : "bg-[var(--color-success)]/15 text-[var(--color-success)]";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold",
        cls,
      )}
    >
      {qty}
    </span>
  );
}

function ToggleSwitch({
  checked,
  label,
  isAr,
}: {
  checked: boolean;
  label: string;
  isAr: boolean;
}) {
  const onWord = isAr ? "مفعّل" : "on";
  const offWord = isAr ? "متوقف" : "off";
  const clickHint = isAr ? "اضغط للتبديل" : "click to toggle";
  return (
    <button
      type="submit"
      aria-pressed={checked ? "true" : "false"}
      aria-label={`${label}: ${checked ? onWord : offWord} — ${clickHint}`}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2",
        checked
          ? "bg-[var(--color-success)]"
          : "bg-[var(--color-surface-2)]",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition",
          checked ? "translate-x-5" : "translate-x-1",
        )}
      />
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
        "px-3 py-2 text-start text-[11px] font-semibold uppercase tracking-wider " +
        (className ?? "")
      }
      {...rest}
    >
      {children}
    </th>
  );
}
