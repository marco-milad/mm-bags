import { LoadingStatus, Skeleton } from "@/components/ui/Skeleton";

/**
 * Categories fallback: the navy hero band (so the page's dominant colour
 * doesn't flash in late) and the 4:5 card grid.
 */
export default function CategoriesLoading() {
  return (
    <article>
      <LoadingStatus label="جاري التحميل… Loading…" />
      <section className="bg-navy-900">
        <div className="mx-auto flex max-w-[1200px] flex-col items-start gap-4 px-6 py-20 md:px-12 md:py-24">
          {/* Skeleton's surface tone would glare on navy; translucent white
              keeps the same pulse at hero contrast. */}
          <div aria-hidden className="h-3 w-28 animate-pulse rounded-md bg-white/10 motion-reduce:animate-none" />
          <div aria-hidden className="h-10 w-72 max-w-full animate-pulse rounded-md bg-white/10 motion-reduce:animate-none md:h-14 md:w-[28rem]" />
          <div aria-hidden className="h-4 w-80 max-w-full animate-pulse rounded-md bg-white/10 motion-reduce:animate-none" />
        </div>
      </section>
      <section className="mx-auto max-w-[1200px] px-6 py-16 md:px-12 md:py-20">
        <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <li key={i}>
              <Skeleton className="aspect-[4/5] w-full rounded-2xl" />
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
