import { notFound } from "next/navigation";
import { hasLocale } from "@/lib/i18n-config";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Forgot password — M.M Bags",
};

export default async function ForgotPasswordPage({
  params,
}: PageProps<"/[locale]/auth/forgot-password">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const isRTL = locale === "ar";

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-12 md:py-20">
      <header className="text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--color-accent-dark)]">
          M.M Bags
        </p>
        <h1 className="mt-3 font-serif text-3xl text-[var(--color-text)]">
          {isRTL ? "نسيت كلمة المرور؟" : "Forgot your password?"}
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          {isRTL
            ? "اكتب بريدك الإلكتروني، هنبعتلك رابط لاستعادتها."
            : "Enter your email and we'll send you a reset link."}
        </p>
      </header>

      <ForgotPasswordForm locale={locale} />
    </div>
  );
}
