"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { ADMIN_NAV } from "@/lib/admin/nav";
import { adminSignOut } from "@/lib/admin/actions";
import { cn } from "@/lib/utils";

/**
 * Admin sidebar. Always-visible on md+ (fixed 260px column); on mobile
 * it's a slide-over panel toggled by the hamburger up top.
 *
 * Active-link highlight is brass-300 text + bg-navy-700 background +
 * a 3px brass-500 inline-start border. We compare against `pathname`
 * with a longest-prefix rule so /admin/reviews/anything-deeper still
 * highlights the Reviews entry.
 */
export function AdminSidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile hamburger — top-left, navy + brass icon to match nav. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="fixed left-3 top-3 z-30 inline-flex h-10 w-10 items-center justify-center rounded-md bg-navy-900 text-brass-300 shadow-lg md:hidden"
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

      {/* Sidebar shell */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-navy-900 text-paper shadow-2xl transition-transform duration-200 md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        {/* Header: logo + close (mobile). LTR layout because admin is
            English-first even when the storefront is RTL — keeps the
            cognitive load lower for cross-language operators. */}
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
              Admin
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="rounded-md p-1 text-paper/70 transition hover:bg-navy-800 hover:text-paper md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Sections */}
        <nav className="flex-1 overflow-y-auto px-2 py-4">
          {ADMIN_NAV.map((section) => (
            <div key={section.id} className="mb-5 last:mb-0">
              <p className="px-3 pb-1.5 font-mono text-[10px] uppercase tracking-[0.3em] text-paper/40">
                {section.label_en}
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
                            className="absolute inset-y-1 left-0 w-[3px] rounded-full bg-brass-500"
                          />
                        )}
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="flex-1">{item.label_en}</span>
                        <span className="font-mono text-[10px] text-paper/40 group-hover:text-paper/60">
                          {item.label_ar}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer: user email + sign-out button. Form posts to the
            server action so the auth cookie gets cleared properly. */}
        <footer className="border-t border-navy-700 px-3 py-3">
          <p
            className="px-2 text-xs text-paper/60 truncate"
            title={userEmail}
          >
            {userEmail}
          </p>
          <form action={adminSignOut} className="mt-2">
            <button
              type="submit"
              className="inline-flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-paper/80 transition hover:bg-navy-800 hover:text-paper"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </form>
        </footer>
      </aside>
    </>
  );
}

/**
 * Longest-prefix match. /admin must match ONLY /admin (not every child),
 * but /admin/reviews/anything matches the Reviews entry.
 */
function isActiveHref(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}
