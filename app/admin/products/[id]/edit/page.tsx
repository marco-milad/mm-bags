import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import {
  getProductFieldSuggestions,
  getProductForEdit,
  listAllCollections,
} from "@/lib/queries/admin-products";
import { ProductForm } from "@/components/admin/products/ProductForm";
import { VariantsManager } from "@/components/admin/products/VariantsManager";
import { getAdminLocale } from "@/lib/admin/locale";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
  searchParams,
}: PageProps<"/admin/products/[id]/edit">) {
  const locale = await getAdminLocale();
  const isAr = locale === "ar";
  const { id } = await params;
  const sp = await searchParams;
  const justCreated = sp?.created === "1";
  const [product, collections, suggestions] = await Promise.all([
    getProductForEdit(id),
    listAllCollections(),
    getProductFieldSuggestions(),
  ]);
  if (!product) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
        >
          <ArrowLeft className="h-3 w-3" />
          {isAr ? "الرجوع للمنتجات" : "Back to products"}
        </Link>
        <Link
          href={`/ar/products/${product.slug}`}
          target="_blank"
          className="inline-flex items-center gap-1 text-xs text-[var(--color-primary)] underline-offset-4 hover:underline"
        >
          {isAr ? "اعرضه على الموقع" : "View on storefront"}
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      <header>
        <h1 className="font-display text-3xl text-[var(--color-text)]">
          {product.name_ar}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          {product.name_en} ·{" "}
          <span className="font-mono">/{product.slug}</span>
        </p>
      </header>

      <ProductForm
        product={product}
        collections={collections}
        locale={locale}
        suggestions={suggestions}
        justCreated={justCreated}
      />

      <div className="border-t border-[var(--color-border)] pt-6">
        <VariantsManager
          productId={product.id}
          variants={product.variants}
          locale={locale}
        />
      </div>
    </div>
  );
}
