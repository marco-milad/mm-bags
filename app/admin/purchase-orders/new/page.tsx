import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  listSuppliers,
  listVariantOptions,
} from "@/lib/queries/suppliers-admin";
import { NewPOForm } from "@/components/admin/purchase-orders/NewPOForm";

export const dynamic = "force-dynamic";

export default async function NewPurchaseOrderPage({
  searchParams,
}: PageProps<"/admin/purchase-orders/new">) {
  const sp = await searchParams;
  const prefillVariantId =
    typeof sp?.variantId === "string" ? sp.variantId : undefined;

  const [suppliers, variants] = await Promise.all([
    listSuppliers(),
    listVariantOptions(),
  ]);

  return (
    <div className="space-y-6">
      <Link
        href="/admin/purchase-orders"
        className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to purchase orders
      </Link>

      <header>
        <h1 className="font-display text-3xl text-[var(--color-text)]">
          New purchase order
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Select supplier, add items, record any up-front payment.
        </p>
      </header>

      <NewPOForm
        suppliers={suppliers}
        variants={variants}
        prefillVariantId={prefillVariantId}
      />
    </div>
  );
}
