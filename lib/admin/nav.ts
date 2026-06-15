import {
  BarChart3,
  Bell,
  ClipboardList,
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
export type AdminNavItem = {
  href: string;
  label_ar: string;
  label_en: string;
  icon: LucideIcon;
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
      },
      {
        href: "/admin/orders",
        label_ar: "الطلبات أونلاين",
        label_en: "Online orders",
        icon: Globe,
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
      },
      {
        href: "/admin/stock",
        label_ar: "المخزون",
        label_en: "Stock",
        icon: BarChart3,
      },
      {
        href: "/admin/collections",
        label_ar: "التشكيلات",
        label_en: "Collections",
        icon: FolderOpen,
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
      },
      {
        href: "/admin/purchase-orders",
        label_ar: "أوامر الشراء",
        label_en: "Purchase orders",
        icon: ClipboardList,
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
      },
      {
        href: "/admin/notifications",
        label_ar: "الإشعارات",
        label_en: "Notifications",
        icon: Bell,
      },
      {
        href: "/admin/newsletter",
        label_ar: "النشرة البريدية",
        label_en: "Newsletter",
        icon: Mail,
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
      },
    ],
  },
];

/** Flat list of all admin items — handy for breadcrumbs / page titles. */
export const ALL_ADMIN_ITEMS: ReadonlyArray<AdminNavItem> = ADMIN_NAV.flatMap(
  (s) => s.items,
);
