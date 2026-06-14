import { z } from "zod";

/**
 * Subject keys are an enum so the server can localize the email subject line
 * regardless of the locale that submitted the form. The client picks the
 * displayed label from CONTACT_SUBJECT_LABELS keyed by the same id.
 */
export const CONTACT_SUBJECT_IDS = [
  "product",
  "complaint",
  "return",
  "partnership",
  "other",
] as const;

export type ContactSubjectId = (typeof CONTACT_SUBJECT_IDS)[number];

export const CONTACT_SUBJECT_LABELS: Record<
  ContactSubjectId,
  { ar: string; en: string }
> = {
  product: { ar: "استفسار عن منتج", en: "Product inquiry" },
  complaint: { ar: "شكوى", en: "Complaint" },
  return: { ar: "طلب إرجاع", en: "Return request" },
  partnership: { ar: "تعاون", en: "Partnership" },
  other: { ar: "أخرى", en: "Other" },
};

export const contactFormSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(80),
  email: z.email("Invalid email").max(120),
  // Phone is optional. We don't enforce a format because customers may type
  // it with or without country code, with spaces, dashes, etc. Server-side
  // we just trim and cap length.
  phone: z
    .string()
    .trim()
    .max(30)
    .optional()
    .or(z.literal("")),
  subject: z.enum(CONTACT_SUBJECT_IDS),
  message: z.string().trim().min(10, "Message is too short").max(2000),
  // Honeypot — real users leave this blank. We *allow* any value in the
  // schema so the route handler can detect a non-empty `hp` and return a
  // silent 200, hiding from the bot whether the submission worked.
  hp: z.string().max(200).optional(),
  // Locale of the submitter, so server can localize the admin notification
  // and the customer-side confirmation if we add one later.
  locale: z.enum(["ar", "en"]),
});

export type ContactFormInput = z.infer<typeof contactFormSchema>;
