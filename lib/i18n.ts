import "server-only";

import arMessages from "@/messages/ar.json";
import enMessages from "@/messages/en.json";
import type { Locale } from "@/lib/i18n-config";

export type Messages = typeof arMessages;

const dictionaries: Record<Locale, () => Promise<Messages>> = {
  ar: async () => arMessages,
  en: async () => enMessages as Messages,
};

export async function getDictionary(locale: Locale): Promise<Messages> {
  return dictionaries[locale]();
}
