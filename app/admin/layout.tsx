import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AdminSidebar } from "@/components/admin/Sidebar";
import { getCurrentRole } from "@/lib/admin/staff-actions";
import { getAdminLocale, isAdminRTL } from "@/lib/admin/locale";
import "../globals.css";

export const dynamic = "force-dynamic";

/**
 * Admin shell. Wraps every /admin route with:
 *   - Auth + role guard (signed-in admin or staff with role=admin)
 *   - Fixed sidebar (260px on md+, slide-over on mobile)
 *   - A scrollable main content area pushed away from the sidebar
 *
 * The shell uses its own <html> tag because the public storefront's
 * RootLayout adds locale-specific fonts and an RTL direction. The
 * admin lang/dir come from a cookie (`admin_locale`) and default to
 * Arabic. The sidebar pins to the inline-start, so in AR it sits on
 * the right and in EN on the left.
 */
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

  const effective = await getCurrentRole();
  if (!effective) {
    redirect("/ar");
  }

  const locale = await getAdminLocale();
  const rtl = isAdminRTL(locale);

  return (
    <html lang={locale} dir={rtl ? "rtl" : "ltr"}>
      <body className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] antialiased">
        <AdminSidebar
          userEmail={user.email ?? "(no email)"}
          role={effective.role}
          locale={locale}
        />

        {/* Inline-start padding pushes the main column off the sidebar
            regardless of direction (ps-64 = padding-inline-start). */}
        <main className="min-h-screen md:ps-64">
          <div className="mx-auto max-w-7xl px-6 py-8 pt-14 md:px-10 md:pt-8">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
