/**
 * Placeholder block for loading.tsx skeletons. Pure markup (no client JS) so
 * route fallbacks stay a few hundred bytes. Decorative: hidden from assistive
 * tech — the wrapping fallback carries the one "loading" announcement.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-md bg-[var(--color-surface-2)] motion-reduce:animate-none ${className}`}
    />
  );
}

/** Mirrors ProductCard's shape: square image, two-line name, price. */
export function ProductCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)]">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="mt-auto h-5 w-1/3" />
      </div>
    </div>
  );
}

/**
 * Screen-reader-only status for a route fallback, so a slow navigation is
 * announced once instead of the page silently going blank.
 */
export function LoadingStatus({ label }: { label: string }) {
  return (
    <p role="status" className="sr-only">
      {label}
    </p>
  );
}
