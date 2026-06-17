"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { ADMIN_NAV, navForRole, type EffectiveRole } from "@/lib/admin/nav";
import { adminSignOut } from "@/lib/admin/actions";
import type { AdminLocale } from "@/lib/admin/locale";
import { AdminLocaleSwitcher } from "@/components/admin/AdminLocaleSwitcher";
import { cn } from "@/lib/utils";

/**
 * Admin sidebar. Always-visible on md+ (fixed 260px column); on mobile
 * it's a slide-over panel toggled by the hamburger up top.
 *
 * The sidebar pins to the inline-start edge so it sits on the RIGHT
 * in Arabic and the LEFT in English without two separate layouts.
 *
 * Active-link highlight is brass-300 text + bg-navy-700 background +
 * a 3px brass-500 inline-start rail. Longest-prefix matching keeps
 * children (e.g. /admin/reviews/anything) highlighting the parent.
 */
export function AdminSidebar({
  userEmail,
  role,
  locale,
}: {
  userEmail: string;
  role: EffectiveRole;
  locale: AdminLocale;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isAr = locale === "ar";
  const sections = navForRole(role);
  const finalSections = sections.length > 0 ? sections : ADMIN_NAV;

  return (
    <>
      {/* Mobile hamburger — pinned to inline-start so it follows the
          sidebar across LTR/RTL. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={isAr ? "افتح القائمة" : "Open menu"}
        className="fixed top-3 start-3 z-30 inline-flex h-10 w-10 items-center justify-center rounded-md bg-navy-900 text-brass-300 shadow-lg md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Backdrop (mobile only) — closes the sidebar on click. */}
      {open && (
        <div
          aria-hidden
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
        />
      )}

      {/* Sidebar shell. `start-0` + logical inset pins it to the
          inline-start edge; the off-screen translate flips sign
          automatically because Tailwind compiles to logical inset. */}
      <aside
        className={cn(
          "fixed inset-y-0 start-0 z-50 flex w-64 flex-col bg-navy-900 text-paper shadow-2xl transition-transform duration-200 md:translate-x-0",
          open
            ? "translate-x-0"
            : isAr
              ? "translate-x-full md:translate-x-0"
              : "-translate-x-full md:translate-x-0",
        )}
      >
        <header className="flex items-center justify-between border-b border-navy-700 px-5 py-4">
          <Link href="/admin" className="inline-flex items-center gap-2">
            <Image
              src="/assets/logos/logo-navbar-light.svg"
              alt="M.M Bags"
              width={232}
              height={64}
              className="h-8 w-auto"
            />
            <span className="font-mono text-[10px] uppercase tracking-wider text-brass-300">
              {isAr ? "الإدارة" : "Admin"}
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={isAr ? "إغلاق القائمة" : "Close menu"}
            className="rounded-md p-1 text-paper/70 transition hover:bg-navy-800 hover:text-paper md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <nav className="flex-1 overflow-y-auto px-2 py-4">
          {finalSections.map((section) => (
            <div key={section.id} className="mb-5 last:mb-0">
              <p className="px-3 pb-1.5 font-mono text-[10px] uppercase tracking-[0.3em] text-paper/40">
                {isAr ? section.label_ar : section.label_en}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = isActiveHref(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition",
                          isActive
                            ? "bg-navy-700 text-brass-300"
                            : "text-paper/80 hover:bg-navy-800 hover:text-paper",
                        )}
                      >
                        {/* Brass inline-start rail for the active entry */}
                        {isActive && (
                          <span
                            aria-hidden
                            className="absolute inset-y-1 start-0 w-[3px] rounded-full bg-brass-500"
                          />
                        )}
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="flex-1">
                          {isAr ? item.label_ar : item.label_en}
                        </span>
                        <span className="font-mono text-[10px] text-paper/40 group-hover:text-paper/60">
                          {isAr ? item.label_en : item.label_ar}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer: language toggle + user email + sign-out. */}
        <footer className="space-y-3 border-t border-navy-700 px-3 py-3">
          <div className="px-2">
            <AdminLocaleSwitcher locale={locale} />
          </div>
          <div>
            <p
              className="px-2 text-xs text-paper/60 truncate"
              title={userEmail}
            >
              {userEmail}
            </p>
            <p className="px-2 font-mono text-[10px] uppercase tracking-wider text-brass-300/70">
              {role}
            </p>
          </div>
          <form action={adminSignOut}>
            <button
              type="submit"
              className="inline-flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-paper/80 transition hover:bg-navy-800 hover:text-paper"
            >
              <LogOut className="h-3.5 w-3.5" />
              {isAr ? "تسجيل الخروج" : "Sign out"}
            </button>
          </form>
        </footer>
      </aside>
    </>
  );
}

function isActiveHref(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}
