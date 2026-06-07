import type { Locale } from "@/lib/i18n-config";
import { cn } from "@/lib/utils";

type SocialLink = {
  href: string;
  label: string;
  path: string; // single SVG `d` path; viewBox is 24×24
};

// Brand glyphs as inline SVGs. lucide-react 1.x doesn't ship brand icons,
// and following the same pattern as components/shared/WhatsAppFAB.tsx keeps
// the icon style consistent across the floating accessories.
const LINKS: ReadonlyArray<SocialLink> = [
  {
    href: "https://facebook.com/mmbags.eg",
    label: "Facebook",
    path: "M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z",
  },
  {
    href: "https://instagram.com/mmbags.eg",
    label: "Instagram",
    path: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z",
  },
  {
    href: "https://tiktok.com/@mmbags.eg",
    label: "TikTok",
    path: "M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.1z",
  },
];

/**
 * Vertical social-links bar pinned to the page edge on desktop. Hidden on
 * mobile (everything important is in the hamburger sheet there). RTL flips
 * the bar to the right side so it stays on the inline-start edge.
 *
 * One-shot CSS slide on first paint — no JS, no useEffect.
 */
export function SocialBar({ locale }: { locale: Locale }) {
  const isRTL = locale === "ar";

  return (
    <aside
      aria-label={isRTL ? "روابط التواصل الاجتماعي" : "Social media links"}
      className={cn(
        "fixed top-1/2 z-30 hidden -translate-y-1/2 md:flex",
        // Logical-side pin: LTR → left edge, RTL → right edge (inline-start).
        isRTL ? "right-0" : "left-0",
      )}
      style={{
        animation:
          "mm-social-slide-in 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.4s both",
      }}
    >
      <ul
        className={cn(
          "flex flex-col overflow-hidden border-brass-500/30 bg-navy-900 shadow-lg shadow-black/20",
          isRTL
            ? "rounded-l-xl border border-r-0"
            : "rounded-r-xl border border-l-0",
        )}
      >
        {LINKS.map(({ href, label, path }) => (
          <li key={href}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className="flex h-11 w-11 items-center justify-center text-brass-300 transition duration-200 hover:bg-brass-500 hover:text-navy-900"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                aria-hidden
                fill="currentColor"
              >
                <path d={path} />
              </svg>
            </a>
          </li>
        ))}
      </ul>

      {/* Keyframes scoped here so we don't pollute globals.css for a
          one-element animation. Direction mirrors the side the bar pins to. */}
      <style>{`
        @keyframes mm-social-slide-in {
          from { transform: translate(${isRTL ? "100%" : "-100%"}, -50%); opacity: 0; }
          to   { transform: translate(0, -50%);                          opacity: 1; }
        }
      `}</style>
    </aside>
  );
}
