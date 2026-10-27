import { z } from "zod";

export const newsletterSchema = z.object({
  email: z.email("Invalid email").max(120),
  locale: z.enum(["ar", "en"]),
});

export type NewsletterInput = z.infer<typeof newsletterSchema>;
