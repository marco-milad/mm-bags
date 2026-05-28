export type Governorate = {
  code: string;
  name_ar: string;
  name_en: string;
};

// 27 Egyptian governorates, ordered roughly by region (Cairo first as default).
export const EG_GOVERNORATES: readonly Governorate[] = [
  { code: "cairo", name_ar: "القاهرة", name_en: "Cairo" },
  { code: "giza", name_ar: "الجيزة", name_en: "Giza" },
  { code: "alexandria", name_ar: "الإسكندرية", name_en: "Alexandria" },
  { code: "qalyubia", name_ar: "القليوبية", name_en: "Qalyubia" },
  { code: "sharqia", name_ar: "الشرقية", name_en: "Sharqia" },
  { code: "dakahlia", name_ar: "الدقهلية", name_en: "Dakahlia" },
  { code: "gharbia", name_ar: "الغربية", name_en: "Gharbia" },
  { code: "monufia", name_ar: "المنوفية", name_en: "Monufia" },
  { code: "kafr-el-sheikh", name_ar: "كفر الشيخ", name_en: "Kafr El Sheikh" },
  { code: "beheira", name_ar: "البحيرة", name_en: "Beheira" },
  { code: "damietta", name_ar: "دمياط", name_en: "Damietta" },
  { code: "port-said", name_ar: "بورسعيد", name_en: "Port Said" },
  { code: "ismailia", name_ar: "الإسماعيلية", name_en: "Ismailia" },
  { code: "suez", name_ar: "السويس", name_en: "Suez" },
  { code: "north-sinai", name_ar: "شمال سيناء", name_en: "North Sinai" },
  { code: "south-sinai", name_ar: "جنوب سيناء", name_en: "South Sinai" },
  { code: "fayoum", name_ar: "الفيوم", name_en: "Fayoum" },
  { code: "beni-suef", name_ar: "بني سويف", name_en: "Beni Suef" },
  { code: "minya", name_ar: "المنيا", name_en: "Minya" },
  { code: "assiut", name_ar: "أسيوط", name_en: "Assiut" },
  { code: "sohag", name_ar: "سوهاج", name_en: "Sohag" },
  { code: "qena", name_ar: "قنا", name_en: "Qena" },
  { code: "luxor", name_ar: "الأقصر", name_en: "Luxor" },
  { code: "aswan", name_ar: "أسوان", name_en: "Aswan" },
  { code: "red-sea", name_ar: "البحر الأحمر", name_en: "Red Sea" },
  { code: "new-valley", name_ar: "الوادي الجديد", name_en: "New Valley" },
  { code: "matrouh", name_ar: "مطروح", name_en: "Matrouh" },
] as const;

export const GOVERNORATE_CODES = EG_GOVERNORATES.map((g) => g.code);
