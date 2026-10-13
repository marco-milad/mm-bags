import { GRID_CLASS } from "@/components/catalog/CatalogView";
import { LoadingStatus, ProductCardSkeleton, Skeleton } from "@/components/ui/Skeleton";

/**
 * Catalog fallback while the (force-dynamic) page fetches. Mirrors
 * CatalogView's frame — crumbs, header, filter pills, toolbar, card grid —
 * so the real page swaps in without a layout jump. Also reused by
 * catalog/[collection]/loading.tsx. No locale here: loading files get no
 * params, so the only text is the bilingual screen-reader status.
 */
export default function CatalogLoading() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
      <LoadingStatus label="جاري التحميل… Loading…" />
      <Skeleton className="mb-4 h-3 w-40" />
      <div className="mb-6 flex flex-col gap-2">
        <Skeleton className="h-3 w-14" />
        <Skeleton className="h-9 w-56 md:h-10" />
      </div>
      <div className="flex gap-2 overflow-hidden pb-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-24 shrink-0 rounded-full" />
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between border-y border-[var(--color-border)] py-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-28 rounded-full" />
      </div>
      <ul className={GRID_CLASS}>
        {Array.from({ length: 8 }, (_, i) => (
          <li key={i} className="h-full">
            <ProductCardSkeleton />
          </li>
        ))}
      </ul>
    </section>
  );
}
