import { z } from "zod";
import { GOVERNORATE_CODES } from "./governorates";

export const FREE_SHIPPING_THRESHOLD = 1500;
export const SHIPPING_FEE = 50;
export const COD_FEE = 25;

export const shippingSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: "الاسم لازم يكون حرفين على الأقل" })
    .max(100),
  phone: z
    .string()
    .trim()
    .regex(/^01[0125]\d{8}$/, {
      message: "رقم موبايل غير صحيح — لازم يبدأ بـ 010 / 011 / 012 / 015",
    }),
  email: z
    .union([z.literal(""), z.string().email({ message: "بريد إلكتروني غير صحيح" })])
    .optional(),
  governorate: z.enum(GOVERNORATE_CODES as [string, ...string[]], {
    message: "اختار المحافظة",
  }),
  city: z.string().trim().min(2, { message: "اكتب اسم المدينة" }).max(100),
  street: z.string().trim().min(3, { message: "اكتب عنوان الشارع" }).max(200),
  building: z.string().trim().max(100).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export const paymentSchema = z.object({
  paymentMethod: z.enum(["card", "cod"], { message: "اختار طريقة الدفع" }),
});

export const checkoutSchema = shippingSchema.extend(paymentSchema.shape);

export type ShippingValues = z.infer<typeof shippingSchema>;
export type CheckoutValues = z.infer<typeof checkoutSchema>;

export const cartLineSchema = z.object({
  variantId: z.string().uuid(),
  productId: z.string().uuid(),
  qty: z.number().int().positive().max(99),
  unitPrice: z.number().nonnegative(),
  name_ar: z.string(),
  name_en: z.string(),
  image: z.string().nullable(),
  color_ar: z.string().nullable(),
  color_en: z.string().nullable(),
  color_hex: z.string().nullable(),
  size_inches: z.number().int().nullable(),
});

export const placeOrderInputSchema = z.object({
  checkout: checkoutSchema,
  items: z.array(cartLineSchema).min(1, { message: "السلة فاضية" }),
});

export type PlaceOrderInput = z.infer<typeof placeOrderInputSchema>;

export function calcTotals(
  items: { qty: number; unitPrice: number }[],
  paymentMethod: "card" | "cod",
) {
  const subtotal = items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
  const shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const codFee = paymentMethod === "cod" ? COD_FEE : 0;
  const total = subtotal + shippingFee + codFee;
  return { subtotal, shippingFee, codFee, total };
}
