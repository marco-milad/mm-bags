import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Heart,
  LogIn,
  Package,
  ShoppingBag,
} from "lucide-react";
import { hasLocale } from "@/lib/i18n-config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getRecentUserOrders,
  getUserWishlistCount,
} from "@/lib/queries/account-orders";
import { TrackOrderForm } from "@/components/account/TrackOrderForm";
import { ProfileCard } from "@/components/account/ProfileCard";
import { OrdersHistory } from "@/components/account/OrdersHistory";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Account",
};

/**
 * Account hub.
 *
 * - When signed in: profile card (name / email / member-since /
 *   edit + sign-out), recent orders, wishlist count link, and the
 *   existing TrackOrderForm.
 * - When signed out: the original guest landing — wishlist link,
 *   continue-shopping CTA, and TrackOrderForm — plus a "Sign in"
 *   banner at the top so guests can recover an old session.
 *
 * The session lookup is wrapped in try/catch so a corrupt cookie
 * (the same scenario the auth pages handle) can't 500 the account
 * page either.
 */
export default async function AccountPage({
  params,
}: PageProps<"/[locale]/account">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();

  const isRTL = locale === "ar";
  const Forward = isRTL ? ArrowLeft : ArrowRight;

  // Resolve the authenticated user (if any). Defensive try/catch so a
  // bad/stale Supabase auth cookie can't blow up the page.
  let user: Awaited<
    ReturnType<
      Awaited<ReturnType<typeof createSupabaseServerClient>>["auth"]["getUser"]
    >
  >["data"]["user"] = null;
  try {
    const supabase = await createSupabaseServerClient();
    const res = await supabase.auth.getUser();
    user = res.data.user;
  } catch {
    user = null;
  }

  // Fetch orders + wishlist count in parallel only when signed in —
  // unauthenticated users would see empty rows anyway.
  const [orders, wishlistCount] = user
    ? await Promise.all([
        getRecentUserOrders(user.id, 10),
        getUserWishlistCount(user.id),
      ])
    : [[], 0];

  const displayName =
    (user?.user_metadata as { name?: string } | null)?.name ?? "";
  const email = user?.email ?? "";
  const memberSince = user?.created_at ?? new Date().toISOString();

  return (
    <section className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-12">
      <header className="mb-8 flex flex-col gap-2">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-[var(--color-text-secondary)]">
          {isRTL ? "حسابي" : "My account"}
        </p>
        <h1 className="font-display text-3xl md:text-4xl">
          {user
            ? isRTL
              ? `أهلاً${displayName ? "، " + displayName : ""}`
              : `Welcome${displayName ? ", " + displayName.split(" ")[0] : ""}`
            : isRTL
              ? "أهلاً بيك"
              : "Welcome back"}
        </h1>
        <p className="mt-2 max-w-prose text-[var(--color-text-secondary)]">
          {user
            ? isRTL
              ? "كل طلباتك، مفضلتك، وبياناتك في مكان واحد."
              : "Your orders, wishlist, and profile — all in one place."
            : isRTL
              ? "في M.M Bags مش بنطلب حساب عشان تشتري. هنا هتلاقي المفضلة وتقدر تتبّع طلبك بأي وقت."
              : "No account needed to shop at M.M Bags — find your saved items and track an order anytime."}
        </p>
      </header>

      {/* Guests get a sign-in banner up top so the recovery path is
          obvious without forcing them out of the page. */}
      {!user && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/5 p-5">
          <div>
            <p className="font-display text-base text-[var(--color-text)]">
              {isRTL
                ? "عندك حساب؟ سجل دخول لمتابعة طلباتك."
                : "Have an account? Sign in to see your orders."}
            </p>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {isRTL
                ? "الحساب اختياري — ممكن تتسوق وتتبع طلباتك من غيره."
                : "Optional — you can shop and track orders as a guest."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/${locale}/auth/login?next=${encodeURIComponent(`/${locale}/account`)}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-primary)]/90"
            >
              <LogIn className="h-4 w-4" />
              {isRTL ? "تسجيل دخول" : "Sign in"}
            </Link>
            <Link
              href={`/${locale}/auth/register`}
              className="inline-flex items-center rounded-full border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text)] transition hover:border-[var(--color-accent)]"
            >
              {isRTL ? "إنشاء حساب" : "Register"}
            </Link>
          </div>
        </div>
      )}

      {/* Signed-in view: profile card + orders + wishlist link. */}
      {user && (
        <div className="grid gap-4">
          <ProfileCard
            locale={locale}
            email={email}
            initialName={displayName}
            memberSince={memberSince}
          />
          <OrdersHistory locale={locale} orders={orders} />
        </div>
      )}

      {/* Quick links — visible to everyone. The wishlist card shows
          the live count for signed-in users. */}
      <div className={user ? "mt-4 grid gap-4 md:grid-cols-2" : "grid gap-4 md:grid-cols-2"}>
        <Link
          href={`/${locale}/account/wishlist`}
          className="group flex items-start justify-between gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 transition hover:border-[var(--color-text)]"
        >
          <div className="flex flex-col gap-1">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-text)] text-[var(--color-bg)]">
              <Heart className="h-5 w-5" />
            </div>
            <h2 className="font-display text-xl">
              {isRTL ? "المفضلة" : "Wishlist"}
              {user && wishlistCount > 0 && (
                <span className="ms-2 font-mono text-xs text-[var(--color-text-secondary)]">
                  ({wishlistCount})
                </span>
              )}
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {isRTL
                ? "كل الشنط اللي حفظتيها في مكان واحد."
                : "Every bag you've saved, in one place."}
            </p>
          </div>
          <Forward className="mt-2 h-5 w-5 shrink-0 text-[var(--color-text-secondary)] transition group-hover:text-[var(--color-text)]" />
        </Link>

        <Link
          href={`/${locale}/catalog`}
          className="group flex items-start justify-between gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 transition hover:border-[var(--color-text)]"
        >
          <div className="flex flex-col gap-1">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-text)] text-[var(--color-bg)]">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <h2 className="font-display text-xl">
              {isRTL ? "كمل تسوّق" : "Continue shopping"}
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {isRTL
                ? "تجوّل في كل المجموعات والألوان."
                : "Browse every collection and color."}
            </p>
          </div>
          <Forward className="mt-2 h-5 w-5 shrink-0 text-[var(--color-text-secondary)] transition group-hover:text-[var(--color-text)]" />
        </Link>
      </div>

      <div className="mt-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-text)] text-[var(--color-bg)]">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-xl">
              {isRTL ? "تتبّع طلبك" : "Track your order"}
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {isRTL
                ? "اكتب رقم الطلب اللي وصلك على الواتساب أو الإيميل."
                : "Enter the order ID we sent you on WhatsApp or email."}
            </p>
          </div>
        </div>
        <TrackOrderForm locale={locale} />
      </div>
    </section>
  );
}
