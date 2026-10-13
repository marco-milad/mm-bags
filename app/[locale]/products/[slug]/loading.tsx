import { LoadingStatus, Skeleton } from "@/components/ui/Skeleton";

/**
 * Product page fallback: breadcrumb, then the two-column gallery / buy-box
 * grid ProductDetailLayout renders (stacked on mobile, gallery first).
 */
export default function ProductLoading() {
  return (
    <article className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-12">
      <LoadingStatus label="جاري التحميل… Loading…" />
      <Skeleton className="mb-6 h-3 w-40" />
      <div className="grid gap-8 md:grid-cols-2 md:gap-12">
        <div className="flex flex-col gap-3">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-16 w-16 shrink-0 rounded-lg" />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-9 w-4/5" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-7 w-32" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-11 w-11 rounded-full" />
            ))}
          </div>
          <Skeleton className="h-12 w-full rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    </article>
  );
}
