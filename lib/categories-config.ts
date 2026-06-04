import {
  Backpack,
  GraduationCap,
  Handbag,
  Laptop,
  Luggage,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";

// Emoji map — retained for places where the live brand voice still leans casual
// (e.g. mega-menu fallback, share text). The elevated design system prefers
// Lucide line icons; see CATEGORY_LUCIDE below.
export const CATEGORY_ICONS: Record<string, string> = {
  "travel-bags": "🧳",
  backpacks: "🎒",
  "school-bags": "🏫",
  "ladies-bags": "👜",
  handbags: "👛",
  "laptop-bags": "💻",
};

export function categoryIcon(slug: string): string {
  return CATEGORY_ICONS[slug] ?? "🛍️";
}

// Lucide icon component map — the elevated design system uses these for
// category cards, mega-menu, and any surface that wants a refined mark.
export const CATEGORY_LUCIDE: Record<string, LucideIcon> = {
  "travel-bags": Luggage,
  backpacks: Backpack,
  "school-bags": GraduationCap,
  "ladies-bags": Handbag,
  handbags: ShoppingBag,
  "laptop-bags": Laptop,
};

export function categoryLucideIcon(slug: string): LucideIcon {
  return CATEGORY_LUCIDE[slug] ?? ShoppingBag;
}

// Lifestyle cover images per category — Unsplash stand-ins until real
// photography lands (per PHOTOGRAPHY.md). Width param sized for card use;
// next/image generates the responsive srcset.
export const CATEGORY_IMAGES: Record<string, string> = {
  "travel-bags":
    "https://images.unsplash.com/photo-1581553673739-c4906b5d0de8?w=800&q=80",
  backpacks:
    "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80",
  "school-bags":
    "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=800&q=80",
  "ladies-bags":
    "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80",
  handbags:
    "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80",
  "laptop-bags":
    "https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=800&q=80",
};

export function categoryImage(slug: string): string {
  return (
    CATEGORY_IMAGES[slug] ??
    CATEGORY_IMAGES["travel-bags"]
  );
}
