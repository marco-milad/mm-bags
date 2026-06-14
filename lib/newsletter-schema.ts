import { z } from "zod";

export const newsletterSchema = z.object({
  email: z.email("Invalid email").max(120),
  locale: z.enum(["ar", "en"]),
});

export type NewsletterInput = z.infer<typeof newsletterSchema>;

/**
 * Discount code handed to new subscribers. Kept here so the welcome email
 * and any future UI copy reference the same string.
 */
export const NEWSLETTER_WELCOME_CODE = "WELCOME10";
