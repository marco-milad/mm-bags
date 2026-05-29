export type TripLength = "1-3days" | "4-7days" | "1-2weeks" | "2weeks+";
export type TripType = "business" | "family" | "weekend";
export type PackingStyle = "light" | "heavy";

export type RecommendedSize = "20\"" | "24\"" | "28\"" | "set-3piece";

export type SizeRecommendation = {
  size: RecommendedSize;
  label_ar: string;
  label_en: string;
  reason_ar: string;
  reason_en: string;
  // Query string for /[locale]/catalog
  filter: string;
};

export function recommendSize(
  tripLength: TripLength,
  tripType: TripType,
  packingStyle: PackingStyle,
): SizeRecommendation {
  if (tripLength === "1-3days" && packingStyle === "light") {
    return {
      size: "20\"",
      label_ar: "الشنطة الصغيرة (20\")",
      label_en: "Cabin 20\"",
      reason_ar: "مثالية للرحلات القصيرة وحجم الكابين.",
      reason_en: "Perfect for short trips and carry-on size.",
      filter: "?size=20",
    };
  }

  if (tripLength === "4-7days" && packingStyle === "light") {
    return {
      size: "24\"",
      label_ar: "الشنطة الوسط (24\")",
      label_en: "Medium 24\"",
      reason_ar: "مساحة كافية لأسبوع كامل بدون ضغط زيادة.",
      reason_en: "Enough room for a full week without overpacking.",
      filter: "?size=24",
    };
  }

  if (tripLength === "4-7days" && packingStyle === "heavy") {
    return {
      size: "28\"",
      label_ar: "الشنطة الكبيرة (28\")",
      label_en: "Large 28\"",
      reason_ar: "مساحة واسعة لكل حاجاتك مهما كانت.",
      reason_en: "Spacious enough for everything you need.",
      filter: "?size=28",
    };
  }

  if (tripLength === "1-2weeks" || tripType === "family") {
    return {
      size: "set-3piece",
      label_ar: "طقم 3 قطع",
      label_en: "3-Piece Set",
      reason_ar: "الحل الأمثل للعائلات والرحلات الطويلة.",
      reason_en: "The right call for families and long trips.",
      filter: "?type=set",
    };
  }

  if (tripLength === "2weeks+") {
    return {
      size: "set-3piece",
      label_ar: "طقم 3 قطع",
      label_en: "3-Piece Set",
      reason_ar: "لرحلات أكتر من أسبوعين، الطقم الكامل ضروري.",
      reason_en: "For trips longer than 2 weeks, the full set is essential.",
      filter: "?type=set",
    };
  }

  return {
    size: "24\"",
    label_ar: "الشنطة الوسط (24\")",
    label_en: "Medium 24\"",
    reason_ar: "الاختيار الأكثر توازناً للسفر اليومي.",
    reason_en: "The most balanced choice for everyday travel.",
    filter: "?size=24",
  };
}
