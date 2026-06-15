import { z } from "zod";

export const reviewSchema = z.object({
  productId: z.string().uuid(),
  name: z
    .string()
    .trim()
    .min(2, { message: "الاسم لازم يكون حرفين على الأقل" })
    .max(50, { message: "الاسم طويل أوي" }),
  rating: z
    .number()
    .int()
    .min(1, { message: "اختار تقييم من 1 لـ 5 نجوم" })
    .max(5),
  title: z
    .string()
    .trim()
    .max(100, { message: "العنوان طويل أوي" })
    .optional()
    .or(z.literal("")),
  body: z
    .string()
    .trim()
    .min(10, { message: "اكتب على الأقل 10 حروف" })
    .max(1000, { message: "النص طويل أوي" }),
  // Optional image URLs (uploaded via /api/reviews/upload to the
  // review-photos bucket). Capped at 3 so the moderation queue stays
  // sane and a single review can't bloat the row. We don't `.default([])`
  // here so rhf's input/output types stay aligned — the action treats
  // `undefined` and `[]` the same.
  images: z
    .array(z.url())
    .max(3, { message: "أقصى 3 صور لكل تقييم" })
    .optional(),
});

export type ReviewInput = z.infer<typeof reviewSchema>;
