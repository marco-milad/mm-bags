import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Heart, Package, ShoppingBag } from "lucide-react";
import { hasLocale } from "@/lib/i18n-config";
import { TrackOrderForm } from "@/components/account/TrackOrderForm";

export const metadata = {
  title: "Account",
};

export default async function AccountPage({
  params,
}: PageProps<"/[locale]/account">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();

  const isRTL = locale === "ar";
  const Forward = isRTL ? ArrowLeft : ArrowRight;

  return (
    <section className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-12">
      <header className="mb-8 flex flex-col gap-2">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-[var(--color-text-secondary)]">
          {isRTL ? "حسابي" : "My account"}
        </p>
        <h1 className="font-display text-3xl md:text-4xl">
          {isRTL ? "أهلاً بيك" : "Welcome back"}
        </h1>
        <p className="mt-2 max-w-prose text-[var(--color-text-secondary)]">
          {isRTL
            ? "في M.M Bags مش بنطلب حساب عشان تشتري. هنا هتلاقي المفضلة وتقدر تتبّع طلبك بأي وقت."
            : "No account needed to shop at M.M Bags — find your saved items and track an order anytime."}
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href={`/${locale}/account/wishlist`}
          className="group flex items-start justify-between gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 transition hover:border-[var(--color-text)]"
        >
          <div className="flex flex-col gap-1">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-text)] text-[var(--color-bg)]">
              <Heart className="h-5 w-5" />
            </div>
            <h2 className="font-display text-xl">{isRTL ? "المفضلة" : "Wishlist"}</h2>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {isRTL ? "كل الشنط اللي حفظتيها في مكان واحد." : "Every bag you've saved, in one place."}
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
            <h2 className="font-display text-xl">{isRTL ? "كمل تسوّق" : "Continue shopping"}</h2>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {isRTL ? "تجوّل في كل المجموعات والألوان." : "Browse every collection and color."}
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
            <h2 className="font-display text-xl">{isRTL ? "تتبّع طلبك" : "Track your order"}</h2>
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
