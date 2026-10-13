import Link from "next/link";
import { notFound } from "next/navigation";
import { hasLocale } from "@/lib/i18n-config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Set a new password — M.M Bags",
  robots: { index: false },
};

/**
 * Last step of "forgot password". The reset email links to /auth/callback,
 * which exchanges the code for a session and sends the shopper here. No
 * session means the link was already used or has expired.
 */
export default async function ResetPasswordPage({
  params,
}: PageProps<"/[locale]/auth/reset-password">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const isRTL = locale === "ar";

  let signedIn = false;
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    signedIn = !!data.user;
  } catch {
    signedIn = false;
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-12 md:py-20">
      <header className="text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--color-accent-dark)]">
          M.M Bags
        </p>
        <h1 className="mt-3 font-serif text-3xl text-[var(--color-text)]">
          {isRTL ? "اختار كلمة مرور جديدة" : "Choose a new password"}
        </h1>
      </header>

      {signedIn ? (
        <ResetPasswordForm locale={locale} />
      ) : (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center">
          <p className="text-sm text-[var(--color-text)]">
            {isRTL
              ? "الرابط ده اتستخدم قبل كده أو انتهى. اطلب رابط جديد."
              : "This link was already used or has expired. Request a new one."}
          </p>
          <Link
            href={`/${locale}/auth/forgot-password`}
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--color-primary)] px-6 text-sm font-semibold text-white transition hover:bg-[var(--color-primary)]/90"
          >
            {isRTL ? "اطلب رابط جديد" : "Request a new link"}
          </Link>
        </div>
      )}
    </div>
  );
}
