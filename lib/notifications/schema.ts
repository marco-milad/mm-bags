import { z } from "zod";

const EG_PHONE_RE = /^01[0125]\d{8}$/;

export const backInStockSchema = z
  .object({
    productId: z.string().uuid(),
    variantId: z.string().uuid(),
    channel: z.enum(["email", "whatsapp"]),
    email: z.string().email().optional(),
    phone: z.string().regex(EG_PHONE_RE).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.channel === "email" && !data.email) {
      ctx.addIssue({
        code: "custom",
        path: ["email"],
        message: "لازم تكتب الإيميل",
      });
    }
    if (data.channel === "whatsapp" && !data.phone) {
      ctx.addIssue({
        code: "custom",
        path: ["phone"],
        message: "لازم تكتب رقم الواتساب",
      });
    }
  });

export type BackInStockInput = z.infer<typeof backInStockSchema>;
