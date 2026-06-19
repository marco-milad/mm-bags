import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  getProductFieldSuggestions,
  listAllCollections,
} from "@/lib/queries/admin-products";
import { ProductForm } from "@/components/admin/products/ProductForm";
import { getAdminLocale } from "@/lib/admin/locale";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const locale = await getAdminLocale();
  const isAr = locale === "ar";
  const [collections, suggestions] = await Promise.all([
    listAllCollections(),
    getProductFieldSuggestions(),
  ]);
  return (
    <div className="space-y-6">
      <Link
        href="/admin/products"
        className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
      >
        <ArrowLeft className="h-3 w-3" />
        {isAr ? "الرجوع للمنتجات" : "Back to products"}
      </Link>

      <header>
        <h1 className="font-display text-3xl text-[var(--color-text)]">
          {isAr ? "منتج جديد" : "New product"}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          {isAr
            ? "اعمل المنتج الأول؛ الفاريانتس تتضاف من صفحة التعديل بعد ما تحفظ المنتج."
            : "Create the product first; variants can be added on the edit screen once the product is saved."}
        </p>
      </header>

      <ProductForm
        collections={collections}
        locale={locale}
        suggestions={suggestions}
      />
    </div>
  );
}
