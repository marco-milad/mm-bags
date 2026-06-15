import {
  BarChart3,
  Bell,
  ClipboardList,
  FileBarChart2,
  FolderOpen,
  Globe,
  LayoutDashboard,
  Mail,
  Package,
  ShoppingCart,
  Star,
  Truck,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { StaffRole } from "@/lib/supabase/types";

/**
 * Admin sidebar navigation, grouped into sections. Adding a new admin
 * area means dropping a single entry here — the sidebar and the
 * active-link highlight pick it up automatically.
 *
 * Routes that don't have a `page.tsx` yet are placeholders and will
 * 404 until their respective ERP step ships. Keeping them in the nav
 * up front makes the IA visible (and easier to QA) before the screens
 * are built.
 */
/** Resolved role for the current admin session. "admin" comes from
    user_metadata.role / ADMIN_EMAIL; the others from the staff table. */
export type EffectiveRole = StaffRole | "admin";

export type AdminNavItem = {
  href: string;
  label_ar: string;
  label_en: string;
  icon: LucideIcon;
  /** Smallest role allowed to see this entry. Items without it are
      visible to every signed-in admin/staff member. */
  allowedRoles?: ReadonlyArray<EffectiveRole>;
};

export type AdminNavSection = {
  id: string;
  label_ar: string;
  label_en: string;
  items: ReadonlyArray<AdminNavItem>;
};

export const ADMIN_NAV: ReadonlyArray<AdminNavSection> = [
  {
    id: "overview",
    label_ar: "نظرة عامة",
    label_en: "Overview",
    items: [
      {
        href: "/admin",
        label_ar: "لوحة التحكم",
        label_en: "Dashboard",
        icon: LayoutDashboard,
        allowedRoles: ["manager", "admin"],
      },
    ],
  },
  {
    id: "sales",
    label_ar: "المبيعات",
    label_en: "Sales",
    items: [
      {
        href: "/admin/pos",
        label_ar: "نقطة البيع",
        label_en: "POS",
        icon: ShoppingCart,
        // Every signed-in staffer can ring up a sale.
      },
      {
        href: "/admin/orders",
        label_ar: "الطلبات أونلاين",
        label_en: "Online orders",
        icon: Globe,
        allowedRoles: ["manager", "admin"],
      },
    ],
  },
  {
    id: "inventory",
    label_ar: "المخزون",
    label_en: "Inventory",
    items: [
      {
        href: "/admin/products",
        label_ar: "المنتجات",
        label_en: "Products",
        icon: Package,
        allowedRoles: ["manager", "admin"],
      },
      {
        href: "/admin/stock",
        label_ar: "المخزون",
        label_en: "Stock",
        icon: BarChart3,
        allowedRoles: ["manager", "admin"],
      },
      {
        href: "/admin/collections",
        label_ar: "التشكيلات",
        label_en: "Collections",
        icon: FolderOpen,
        allowedRoles: ["admin"],
      },
    ],
  },
  {
    id: "suppliers",
    label_ar: "الموردين",
    label_en: "Suppliers",
    items: [
      {
        href: "/admin/suppliers",
        label_ar: "الموردين",
        label_en: "Suppliers",
        icon: Truck,
        allowedRoles: ["manager", "admin"],
      },
      {
        href: "/admin/purchase-orders",
        label_ar: "أوامر الشراء",
        label_en: "Purchase orders",
        icon: ClipboardList,
        allowedRoles: ["manager", "admin"],
      },
    ],
  },
  {
    id: "customers",
    label_ar: "العملاء",
    label_en: "Customers",
    items: [
      {
        href: "/admin/reviews",
        label_ar: "التقييمات",
        label_en: "Reviews",
        icon: Star,
        allowedRoles: ["manager", "admin"],
      },
      {
        href: "/admin/notifications",
        label_ar: "الإشعارات",
        label_en: "Notifications",
        icon: Bell,
        allowedRoles: ["admin"],
      },
      {
        href: "/admin/newsletter",
        label_ar: "النشرة البريدية",
        label_en: "Newsletter",
        icon: Mail,
        allowedRoles: ["admin"],
      },
    ],
  },
  {
    id: "reports",
    label_ar: "التقارير",
    label_en: "Reports",
    items: [
      {
        href: "/admin/reports",
        label_ar: "التقارير",
        label_en: "Reports",
        icon: FileBarChart2,
        allowedRoles: ["manager", "admin"],
      },
    ],
  },
  {
    id: "settings",
    label_ar: "الإعدادات",
    label_en: "Settings",
    items: [
      {
        href: "/admin/staff",
        label_ar: "الموظفين",
        label_en: "Staff",
        icon: Users,
        allowedRoles: ["admin"],
      },
    ],
  },
];

/**
 * Filter the full nav by the caller's effective role. Items with no
 * `allowedRoles` are shown to everyone signed in.
 */
export function navForRole(role: EffectiveRole): AdminNavSection[] {
  return ADMIN_NAV.map((section) => ({
    ...section,
    items: section.items.filter(
      (i) => !i.allowedRoles || i.allowedRoles.includes(role),
    ),
  })).filter((section) => section.items.length > 0);
}

/** Flat list of all admin items — handy for breadcrumbs / page titles. */
export const ALL_ADMIN_ITEMS: ReadonlyArray<AdminNavItem> = ADMIN_NAV.flatMap(
  (s) => s.items,
);
