import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { getAdminLocale } from "@/lib/admin/locale";
import { PosReturnsScreen } from "@/components/admin/pos/PosReturnsScreen";

export const dynamic = "force-dynamic";

/**
 * "Return a sale" screen — paired with /admin/pos.
 *
 * Server page kept tiny on purpose: nothing to fetch up-front (the
 * cashier searches by sale_number first), so the entire interaction
 * is a client state machine inside `PosReturnsScreen`.
 */
export default async function PosReturnsPage() {
  const locale = await getAdminLocale();
  const isAr = locale === "ar";

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/pos"
            className="inline-flex items-center gap-1 text-xs text-[var(--color-text-secondary)] transition hover:text-[var(--color-text)]"
          >
            {isAr ? (
              <>
                <ArrowRight className="h-3.5 w-3.5" />
                <span>الرجوع لنقطة البيع</span>
              </>
            ) : (
              <>
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to POS</span>
              </>
            )}
          </Link>
          <h1 className="mt-2 font-display text-3xl text-[var(--color-text)]">
            {isAr ? "إرجاع بيعة" : "Return a sale"}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {isAr
              ? "دوّر على رقم البيعة، اختار الأصناف اللي راجعة، وأكّد الإرجاع."
              : "Find the sale, pick the items coming back, and confirm the return."}
          </p>
        </div>
      </header>

      <PosReturnsScreen locale={locale} />
    </div>
  );
}
