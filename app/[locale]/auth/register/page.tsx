import { notFound, redirect } from "next/navigation";
import { hasLocale } from "@/lib/i18n-config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Register — M.M Bags",
};

export default async function RegisterPage({
  params,
  searchParams,
}: PageProps<"/[locale]/auth/register">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  const sp = await searchParams;
  const nextRaw = typeof sp?.next === "string" ? sp.next : undefined;
  const next = nextRaw && nextRaw.startsWith("/") ? nextRaw : undefined;

  // Defensive: corrupt cookies shouldn't 500 the register path.
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      redirect(next ?? `/${locale}/account`);
    }
  } catch (err) {
    if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
  }

  const isRTL = locale === "ar";

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-12 md:py-20">
      <header className="text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--color-accent-dark)]">
          M.M Bags
        </p>
        <h1 className="mt-3 font-serif text-3xl text-[var(--color-text)]">
          {isRTL ? "إنشاء حساب جديد" : "Create your account"}
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          {isRTL
            ? "خطوة سريعة عشان تتابع طلباتك وتسهل عليك أي شراء جاي."
            : "A quick step to track your orders and speed up checkout."}
        </p>
      </header>

      <RegisterForm locale={locale} next={next} />
    </div>
  );
}
