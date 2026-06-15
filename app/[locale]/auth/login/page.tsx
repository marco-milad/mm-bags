import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { hasLocale } from "@/lib/i18n-config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LoginForm } from "@/components/auth/LoginForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sign in — M.M Bags",
};

export default async function LoginPage({
  params,
  searchParams,
}: PageProps<"/[locale]/auth/login">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const sp = await searchParams;
  const nextRaw = typeof sp?.next === "string" ? sp.next : undefined;
  // Only honour relative paths — open-redirect defence.
  const next = nextRaw && nextRaw.startsWith("/") ? nextRaw : undefined;

  // If the user already has a session, bounce them to the next URL
  // (or their account page) — saves a round trip on stale tabs. The
  // try/catch is defensive: a corrupt/stale Supabase auth cookie can
  // throw inside the SSR client's JSON parse, and we'd rather show
  // the login form than 500 the recovery path.
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      redirect(next ?? `/${locale}/account`);
    }
  } catch (err) {
    // NEXT_REDIRECT throws as part of normal control flow — let it
    // propagate.
    if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
    // Otherwise eat the cookie-parse error and fall through to the
    // login form.
  }

  const isRTL = locale === "ar";

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-12 md:py-20">
      <header className="text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--color-accent-dark)]">
          M.M Bags
        </p>
        <h1 className="mt-3 font-serif text-3xl text-[var(--color-text)]">
          {isRTL ? "تسجيل الدخول" : "Welcome back"}
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          {isRTL
            ? "ادخل ببياناتك لمتابعة طلباتك وقايمة أمنياتك."
            : "Sign in to access your orders and wishlist."}
        </p>
      </header>

      <LoginForm locale={locale} next={next} />

      <p className="text-center text-xs text-[var(--color-text-secondary)]">
        {isRTL ? (
          <>
            بتسجيل الدخول إنت موافق على{" "}
            <Link
              href={`/${locale}/about`}
              className="underline-offset-4 hover:underline"
            >
              شروط الاستخدام
            </Link>
            .
          </>
        ) : (
          <>
            By signing in you agree to our{" "}
            <Link
              href={`/${locale}/about`}
              className="underline-offset-4 hover:underline"
            >
              terms
            </Link>
            .
          </>
        )}
      </p>
    </div>
  );
}
