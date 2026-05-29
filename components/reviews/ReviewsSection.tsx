import { ShieldCheck } from "lucide-react";
import type { Locale } from "@/lib/i18n-config";
import {
  getApprovedReviews,
  summarize,
  type ReviewSummary,
} from "@/lib/queries/reviews";
import type { Review } from "@/lib/supabase/types";
import { ReviewStars } from "./ReviewStars";
import { ReviewsBreakdown } from "./ReviewsBreakdown";
import { ReviewForm } from "./ReviewForm";

export async function ReviewsSection({
  productId,
  productSlug,
  locale,
}: {
  productId: string;
  productSlug: string;
  locale: Locale;
}) {
  const reviews = await getApprovedReviews(productId);
  const summary = summarize(reviews);

  return (
    <section id="reviews" className="mt-16 scroll-mt-24">
      <header className="mb-6 flex items-baseline justify-between">
        <h2 className="font-display text-2xl md:text-3xl">
          {locale === "ar" ? "آراء العملاء" : "Customer reviews"}
        </h2>
        {summary.total > 0 && (
          <p className="text-sm text-[var(--color-text-secondary)]">
            {locale === "ar"
              ? `${summary.total} تقييم`
              : `${summary.total} review${summary.total > 1 ? "s" : ""}`}
          </p>
        )}
      </header>

      <ReviewsBreakdown summary={summary} locale={locale} />

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {reviews.length === 0 ? (
            <EmptyReviews locale={locale} />
          ) : (
            <ul className="space-y-4">
              {reviews.map((r) => (
                <ReviewItem key={r.id} review={r} locale={locale} />
              ))}
            </ul>
          )}
        </div>

        <aside>
          <ReviewForm
            productId={productId}
            productSlug={productSlug}
            locale={locale}
          />
        </aside>
      </div>
    </section>
  );
}

function EmptyReviews({ locale }: { locale: Locale }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center text-sm text-[var(--color-text-secondary)]">
      {locale === "ar"
        ? "كن أول واحد يقيّم المنتج ده — رأيك يفرق."
        : "Be the first to review this product — your feedback matters."}
    </div>
  );
}

function ReviewItem({ review, locale }: { review: Review; locale: Locale }) {
  const date = new Date(review.created_at).toLocaleDateString(
    locale === "ar" ? "ar-EG" : "en-EG",
    { year: "numeric", month: "long", day: "numeric" },
  );
  return (
    <li className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <ReviewStars value={review.rating} size="sm" />
          {review.title && (
            <p className="font-semibold text-[var(--color-text)]">{review.title}</p>
          )}
        </div>
        <p className="font-mono text-xs text-[var(--color-text-secondary)]">
          {date}
        </p>
      </div>
      {review.body && (
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-text)]">
          {review.body}
        </p>
      )}
      <footer className="mt-3 flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
        <span className="font-medium text-[var(--color-text)]">
          {review.guest_name ?? (locale === "ar" ? "عميل" : "Customer")}
        </span>
        {review.verified_purchase && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-success)]/10 px-2 py-0.5 text-[var(--color-success)]">
            <ShieldCheck className="h-3 w-3" />
            {locale === "ar" ? "عميل موثّق" : "Verified buyer"}
          </span>
        )}
      </footer>
    </li>
  );
}

export type { ReviewSummary };
