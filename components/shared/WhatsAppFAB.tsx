import type { Locale } from "@/lib/i18n-config";

export function WhatsAppFAB({ locale }: { locale: Locale }) {
  const number = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "+201000000000").replace(/[^\d]/g, "");
  const message =
    locale === "ar"
      ? "أهلاً ماركو، عايز أسأل عن منتج من M.M Bags."
      : "Hi Marco, I'd like to ask about a product on M.M Bags.";
  const href = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp M.M Bags"
      className="fixed bottom-24 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/20 transition hover:scale-105 md:bottom-6 ltr:right-4 rtl:left-4 md:ltr:right-6 md:rtl:left-6"
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden fill="currentColor">
        <path d="M20.52 3.48A11.85 11.85 0 0 0 12.05 0C5.52 0 .2 5.32.2 11.86c0 2.09.55 4.13 1.6 5.93L0 24l6.36-1.66a11.84 11.84 0 0 0 5.7 1.45h.01c6.53 0 11.85-5.32 11.85-11.86 0-3.17-1.23-6.15-3.4-8.45ZM12.07 21.5h-.01a9.6 9.6 0 0 1-4.9-1.34l-.35-.21-3.78.99 1.01-3.68-.23-.38a9.6 9.6 0 0 1-1.47-5.07c0-5.3 4.32-9.6 9.62-9.6 2.57 0 4.98 1 6.8 2.82a9.55 9.55 0 0 1 2.82 6.79c0 5.3-4.32 9.6-9.51 9.68Zm5.27-7.18c-.29-.14-1.71-.84-1.98-.94-.27-.1-.47-.14-.66.14-.2.29-.76.94-.93 1.13-.17.2-.34.22-.63.07-.29-.14-1.23-.45-2.34-1.44-.87-.77-1.45-1.72-1.62-2.01-.17-.29-.02-.45.13-.59.13-.13.29-.34.43-.51.14-.17.19-.29.29-.49.1-.2.05-.37-.02-.51-.07-.14-.66-1.59-.9-2.18-.24-.57-.48-.49-.66-.5-.17-.01-.37-.01-.57-.01-.2 0-.51.07-.78.37-.27.29-1.03 1-1.03 2.46s1.05 2.85 1.2 3.05c.14.2 2.07 3.16 5.02 4.43.7.3 1.25.48 1.68.62.7.22 1.34.19 1.85.12.56-.08 1.71-.7 1.95-1.37.24-.67.24-1.25.17-1.37-.07-.13-.27-.2-.56-.34Z" />
      </svg>
    </a>
  );
}
