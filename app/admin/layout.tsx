import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AdminSidebar } from "@/components/admin/Sidebar";
import { getCurrentRole } from "@/lib/admin/staff-actions";
import "../globals.css";

export const dynamic = "force-dynamic";

/**
 * Admin shell. Wraps every /admin route with:
 *   - Auth + role guard (signed-in admin or staff with role=admin)
 *   - Fixed sidebar (260px on md+, slide-over on mobile)
 *   - A scrollable main content area pushed right of the sidebar
 *
 * The shell uses its own <html> tag because the public storefront's
 * RootLayout adds locale-specific fonts and an RTL direction; admin
 * is LTR English with a system font stack.
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

  // Resolve the effective role — admin via env/metadata, OR an active
  // staff row (cashier / manager / admin). Non-staff users get punted
  // back to the storefront.
  const effective = await getCurrentRole();
  if (!effective) {
    redirect("/ar");
  }

  return (
    <html lang="en" dir="ltr">
      <body className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] antialiased">
        <AdminSidebar
          userEmail={user.email ?? "(no email)"}
          role={effective.role}
        />

        {/* Main content area sits flush to the right of the 64-unit
            (256px) sidebar on md+; full-width on mobile. The sidebar
            renders its own mobile hamburger in the top-left. */}
        <main className="min-h-screen md:pl-64">
          <div className="mx-auto max-w-7xl px-6 py-8 pt-14 md:px-10 md:pt-8">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
