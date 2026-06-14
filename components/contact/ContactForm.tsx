"use client";

import { Loader2, Send } from "lucide-react";
import { useState } from "react";
import type { Locale } from "@/lib/i18n-config";
import {
  CONTACT_SUBJECT_IDS,
  CONTACT_SUBJECT_LABELS,
  contactFormSchema,
  type ContactSubjectId,
} from "@/lib/contact-schema";
import { cn } from "@/lib/utils";

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success" }
  | { kind: "error"; message: string };

/**
 * Contact form. Client-side mirrors the server schema with the same Zod
 * shape, so users get instant feedback on malformed input without a round
 * trip. On submit we POST /api/contact and show a localized success state
 * that replaces the form (cleaner than a toast for a one-shot action).
 */
export function ContactForm({ locale }: { locale: Locale }) {
  const isRTL = locale === "ar";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState<ContactSubjectId>("product");
  const [message, setMessage] = useState("");
  const [hp, setHp] = useState(""); // honeypot
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const submitting = status.kind === "submitting";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validated = contactFormSchema.safeParse({
      name,
      email,
      phone: phone || undefined,
      subject,
      message,
      hp: hp || undefined,
      locale,
    });
    if (!validated.success) {
      setStatus({
        kind: "error",
        message: isRTL
          ? "في حقول ناقصة أو غير صحيحة، راجعها."
          : "Some fields are missing or invalid — please review.",
      });
      return;
    }

    setStatus({ kind: "submitting" });
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated.data),
      });
      if (!res.ok) {
        setStatus({
          kind: "error",
          message: isRTL
            ? "حصل خطأ، جرب تاني أو ابعتلنا على WhatsApp."
            : "Something went wrong — try again or reach us on WhatsApp.",
        });
        return;
      }
      setStatus({ kind: "success" });
    } catch {
      setStatus({
        kind: "error",
        message: isRTL
          ? "مشكلة في الاتصال، جرب تاني."
          : "Network error — try again.",
      });
    }
  };

  if (status.kind === "success") {
    return (
      <div className="rounded-2xl border border-[var(--color-accent)]/40 bg-[var(--color-surface)] p-8 text-center">
        <p className="font-serif text-2xl text-[var(--color-text)]">
          {isRTL ? "تم إرسال رسالتك ✅" : "Message sent ✅"}
        </p>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          {isRTL
            ? "هنرد عليك خلال 24 ساعة. شكراً لتواصلك مع M.M Bags."
            : "We'll reply within 24 hours. Thanks for reaching out to M.M Bags."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <Field
        id="contact-name"
        label={isRTL ? "الاسم" : "Name"}
        required
        isRTL={isRTL}
      >
        <input
          id="contact-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoComplete="name"
          minLength={2}
          maxLength={80}
          className={inputCls(isRTL)}
        />
      </Field>

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          id="contact-email"
          label={isRTL ? "البريد الإلكتروني" : "Email"}
          required
          isRTL={isRTL}
        >
          <input
            id="contact-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            dir="ltr"
            className={inputCls(isRTL)}
          />
        </Field>

        <Field
          id="contact-phone"
          label={
            isRTL ? "الموبايل (اختياري)" : "Phone (optional)"
          }
          isRTL={isRTL}
        >
          <input
            id="contact-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            dir="ltr"
            maxLength={30}
            className={inputCls(isRTL)}
          />
        </Field>
      </div>

      <Field
        id="contact-subject"
        label={isRTL ? "الموضوع" : "Subject"}
        required
        isRTL={isRTL}
      >
        <select
          id="contact-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value as ContactSubjectId)}
          required
          className={inputCls(isRTL)}
        >
          {CONTACT_SUBJECT_IDS.map((id) => (
            <option key={id} value={id}>
              {isRTL
                ? CONTACT_SUBJECT_LABELS[id].ar
                : CONTACT_SUBJECT_LABELS[id].en}
            </option>
          ))}
        </select>
      </Field>

      <Field
        id="contact-message"
        label={isRTL ? "الرسالة" : "Message"}
        required
        isRTL={isRTL}
      >
        <textarea
          id="contact-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          rows={6}
          minLength={10}
          maxLength={2000}
          className={cn(inputCls(isRTL), "resize-y")}
        />
      </Field>

      {/* Honeypot — visually hidden but discoverable by bots scanning fields */}
      <div className="absolute -left-[9999px] top-auto h-0 w-0 overflow-hidden" aria-hidden>
        <label>
          Leave blank
          <input
            type="text"
            tabIndex={-1}
            value={hp}
            onChange={(e) => setHp(e.target.value)}
            autoComplete="off"
          />
        </label>
      </div>

      {status.kind === "error" && (
        <p
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {status.message}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-black/10 transition hover:bg-[var(--color-primary)]/90 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
      >
        {submitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        {isRTL ? "إرسال" : "Send message"}
      </button>
    </form>
  );
}

function Field({
  id,
  label,
  required,
  isRTL,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  isRTL: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={isRTL ? "text-right" : undefined}>
      <label
        htmlFor={id}
        className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]"
      >
        {label}
        {required && <span className="text-[var(--color-accent-dark)]"> *</span>}
      </label>
      {children}
    </div>
  );
}

function inputCls(isRTL: boolean): string {
  return cn(
    "block w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-sm text-[var(--color-text)] transition focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30",
    isRTL && "text-right",
  );
}
