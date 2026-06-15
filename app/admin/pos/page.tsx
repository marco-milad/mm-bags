import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getCurrentCashier,
  getProductsForPos,
} from "@/lib/queries/pos";
import { POSScreen } from "@/components/admin/pos/POSScreen";

export const dynamic = "force-dynamic";

export default async function POSPage() {
  // Resolve the current authenticated user → their staff row. The
  // admin layout already gates this route to admins, so a null user
  // here would be a routing bug, not a user-input failure — we still
  // accept null and let the POS render with a "no cashier" label.
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [products, cashier] = await Promise.all([
    getProductsForPos(),
    getCurrentCashier(user?.id ?? null),
  ]);

  return (
    <div className="space-y-4">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="font-display text-3xl text-[var(--color-text)]">
            POS · نقطة البيع
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Search, add to cart, take payment.
          </p>
        </div>
      </header>

      <POSScreen
        products={products}
        cashierName={cashier?.name ?? null}
      />
    </div>
  );
}
