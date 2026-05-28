import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/ar/auth/login?next=/admin");
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  const role = (user.user_metadata as { role?: string } | null)?.role;
  const isAdmin = role === "admin" || (adminEmail && user.email === adminEmail);

  if (!isAdmin) {
    redirect("/ar");
  }

  return (
    <html lang="en" dir="ltr">
      <body className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
        <header className="border-b border-[var(--color-border)] bg-[var(--color-primary)] text-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <p className="font-display text-lg">M.M Bags · Admin</p>
            <p className="text-xs text-white/70">{user.email}</p>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
