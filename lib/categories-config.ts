// Client-safe icon mapping per top-level category slug.
// Used by both server (MegaMenu data load) and client (rendering).
// Add new slugs here when a new top-level category is created in admin.

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
