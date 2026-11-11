export type Governorate = {
  code: string;
  name_ar: string;
  name_en: string;
  /** ISO 3166-2 subdivision code (structured-data shipping regions). */
  iso: string;
};

// 27 Egyptian governorates, ordered roughly by region (Cairo first as default).
export const EG_GOVERNORATES: readonly Governorate[] = [
  { code: "cairo", name_ar: "القاهرة", name_en: "Cairo", iso: "EG-C" },
  { code: "giza", name_ar: "الجيزة", name_en: "Giza", iso: "EG-GZ" },
  { code: "alexandria", name_ar: "الإسكندرية", name_en: "Alexandria", iso: "EG-ALX" },
  { code: "qalyubia", name_ar: "القليوبية", name_en: "Qalyubia", iso: "EG-KB" },
  { code: "sharqia", name_ar: "الشرقية", name_en: "Sharqia", iso: "EG-SHR" },
  { code: "dakahlia", name_ar: "الدقهلية", name_en: "Dakahlia", iso: "EG-DK" },
  { code: "gharbia", name_ar: "الغربية", name_en: "Gharbia", iso: "EG-GH" },
  { code: "monufia", name_ar: "المنوفية", name_en: "Monufia", iso: "EG-MNF" },
  { code: "kafr-el-sheikh", name_ar: "كفر الشيخ", name_en: "Kafr El Sheikh", iso: "EG-KFS" },
  { code: "beheira", name_ar: "البحيرة", name_en: "Beheira", iso: "EG-BH" },
  { code: "damietta", name_ar: "دمياط", name_en: "Damietta", iso: "EG-DT" },
  { code: "port-said", name_ar: "بورسعيد", name_en: "Port Said", iso: "EG-PTS" },
  { code: "ismailia", name_ar: "الإسماعيلية", name_en: "Ismailia", iso: "EG-IS" },
  { code: "suez", name_ar: "السويس", name_en: "Suez", iso: "EG-SUZ" },
  { code: "north-sinai", name_ar: "شمال سيناء", name_en: "North Sinai", iso: "EG-SIN" },
  { code: "south-sinai", name_ar: "جنوب سيناء", name_en: "South Sinai", iso: "EG-JS" },
  { code: "fayoum", name_ar: "الفيوم", name_en: "Fayoum", iso: "EG-FYM" },
  { code: "beni-suef", name_ar: "بني سويف", name_en: "Beni Suef", iso: "EG-BNS" },
  { code: "minya", name_ar: "المنيا", name_en: "Minya", iso: "EG-MN" },
  { code: "assiut", name_ar: "أسيوط", name_en: "Assiut", iso: "EG-AST" },
  { code: "sohag", name_ar: "سوهاج", name_en: "Sohag", iso: "EG-SHG" },
  { code: "qena", name_ar: "قنا", name_en: "Qena", iso: "EG-KN" },
  { code: "luxor", name_ar: "الأقصر", name_en: "Luxor", iso: "EG-LX" },
  { code: "aswan", name_ar: "أسوان", name_en: "Aswan", iso: "EG-ASN" },
  { code: "red-sea", name_ar: "البحر الأحمر", name_en: "Red Sea", iso: "EG-BA" },
  { code: "new-valley", name_ar: "الوادي الجديد", name_en: "New Valley", iso: "EG-WAD" },
  { code: "matrouh", name_ar: "مطروح", name_en: "Matrouh", iso: "EG-MT" },
] as const;

export const GOVERNORATE_CODES = EG_GOVERNORATES.map((g) => g.code);
