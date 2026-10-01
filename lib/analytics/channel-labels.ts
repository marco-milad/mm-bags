/** Display labels for the acquisition channels classified by channelFrom(). */
export const CHANNEL_LABELS: Record<string, { ar: string; en: string }> = {
  direct: { ar: "مباشر", en: "Direct" },
  organic_search: { ar: "بحث طبيعي", en: "Organic search" },
  social: { ar: "سوشيال", en: "Social" },
  referral: { ar: "إحالة", en: "Referral" },
  paid: { ar: "إعلانات مدفوعة", en: "Paid" },
  email: { ar: "إيميل", en: "Email" },
};

export function channelLabel(channel: string, isAr: boolean): string {
  const l = CHANNEL_LABELS[channel];
  return l ? (isAr ? l.ar : l.en) : channel;
}
