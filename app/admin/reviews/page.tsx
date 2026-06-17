import Image from "next/image";
import Link from "next/link";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { ReviewStars } from "@/components/reviews/ReviewStars";
import { ReviewActions } from "./ReviewActions";
import { getAdminLocale } from "@/lib/admin/locale";

export const dynamic = "force-dynamic";

type PendingReview = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  guest_name: string | null;
  governorate: string | null;
  images: string[] | null;
  created_at: string;
  product: { name_ar: string; name_en: string; slug: string } | null;
};

/**
 * Admin review moderation queue.
 *
 * Lists every review where `is_approved = false`, newest first, with a
 * one-click Approve + Reject pair next to each row. The query goes via
 * the service-role client so it bypasses RLS (the public anon role can
 * only read approved reviews).
 *
 * The header surfaces the pending count as a brass-tinted badge so the
 * admin sees the queue size before scanning rows.
 */
export default async function AdminReviewsPage() {
  const locale = await getAdminLocale();
  const isAr = locale === "ar";

  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from("reviews")
    .select(
      "id, rating, title, body, guest_name, governorate, images, created_at, product:products!inner(name_ar, name_en, slug)",
    )
    .eq("is_approved", false)
    .order("created_at", { ascending: false });

  const pending = (data ?? []).map((r) => ({
    ...r,
    // PostgREST returns the join object or a single-element array — flatten.
    product: Array.isArray(r.product) ? r.product[0] ?? null : r.product,
  })) as PendingReview[];

  return (
    <section>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-3xl">
            {isAr ? "التقييمات" : "Reviews"}
          </h1>
          <span className="inline-flex items-center rounded-full bg-brass-500/15 px-3 py-0.5 font-mono text-xs font-semibold text-brass-700">
            {isAr ? `${pending.length} في الانتظار` : `${pending.length} pending`}
          </span>
        </div>
        <Link
          href="/admin"
          className="text-xs text-[var(--color-text-secondary)] underline-offset-4 hover:underline"
        >
          {isAr ? "→ لوحة التحكم" : "← Dashboard"}
        </Link>
      </div>

      {pending.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-10 text-center text-sm text-[var(--color-text-secondary)]">
          {isAr
            ? "لا توجد تقييمات في الانتظار. الجديد بيوصل هنا للموافقة."
            : "No pending reviews. New submissions land here for approval."}
        </p>
      ) : (
        <ul className="space-y-4">
          {pending.map((r) => (
            <li
              key={r.id}
              className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] p-5 shadow-sm"
            >
              {/* Product context — link to the public PDP for quick
                  sanity-check before approving. */}
              {r.product && (
                <Link
                  href={`/ar/products/${r.product.slug}`}
                  target="_blank"
                  className="font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--color-accent-dark)] underline-offset-4 hover:underline"
                >
                  {isAr ? r.product.name_ar : r.product.name_en}
                </Link>
              )}

              <div className="mt-2 flex flex-wrap items-center gap-3">
                <ReviewStars value={r.rating} size="sm" />
                <p className="text-sm font-semibold text-[var(--color-text)]">
                  {r.guest_name ?? (isAr ? "(مجهول)" : "(anonymous)")}
                </p>
                {r.governorate && (
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    · {r.governorate}
                  </span>
                )}
                <span className="ms-auto text-[11px] text-[var(--color-text-secondary)]">
                  {new Date(r.created_at).toLocaleString(
                    isAr ? "ar-EG" : "en-US",
                    {
                      dateStyle: "medium",
                      timeStyle: "short",
                    },
                  )}
                </span>
              </div>

              {r.title && (
                <p className="mt-3 font-display text-lg text-[var(--color-text)]">
                  {r.title}
                </p>
              )}
              {r.body && (
                <p className="mt-1 text-sm leading-relaxed text-[var(--color-text)] whitespace-pre-wrap">
                  {r.body}
                </p>
              )}

              {r.images && r.images.length > 0 && (
                <ul className="mt-4 flex flex-wrap gap-2">
                  {r.images.map((src) => (
                    <li
                      key={src}
                      className="relative h-20 w-20 overflow-hidden rounded-lg border border-[var(--color-border)]"
                    >
                      <Image
                        src={src}
                        alt=""
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    </li>
                  ))}
                </ul>
              )}

              <ReviewActions
                reviewId={r.id}
                productSlug={r.product?.slug ?? null}
                locale={locale}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
