import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import {
  getProductForEdit,
  listAllCollections,
} from "@/lib/queries/admin-products";
import { ProductForm } from "@/components/admin/products/ProductForm";
import { VariantsManager } from "@/components/admin/products/VariantsManager";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: PageProps<"/admin/products/[id]/edit">) {
  const { id } = await params;
  const [product, collections] = await Promise.all([
    getProductForEdit(id),
    listAllCollections(),
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
          Back to products
        </Link>
        <Link
          href={`/ar/products/${product.slug}`}
          target="_blank"
          className="inline-flex items-center gap-1 text-xs text-[var(--color-primary)] underline-offset-4 hover:underline"
        >
          View on storefront
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

      <ProductForm product={product} collections={collections} />

      <div className="border-t border-[var(--color-border)] pt-6">
        <VariantsManager
          productId={product.id}
          variants={product.variants}
        />
      </div>
    </div>
  );
}
