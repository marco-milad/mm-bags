"use client";

import { Loader2, LogOut, Pencil, X } from "lucide-react";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  signOut,
  updateProfile,
  type UpdateProfileResult,
} from "@/lib/account/actions";
import type { Locale } from "@/lib/i18n-config";
import { cn } from "@/lib/utils";

/**
 * Profile summary card. Shows name + email + member-since date in
 * a read-only view, with a "Edit profile" toggle that swaps in an
 * inline form. The form updates user_metadata.name via the
 * updateProfile server action and surfaces success/error inline.
 *
 * Also renders the sign-out button, since it's the natural place
 * for it on a profile card.
 */
export function ProfileCard({
  locale,
  email,
  initialName,
  memberSince,
}: {
  locale: Locale;
  email: string;
  initialName: string;
  memberSince: string;
}) {
  const isRTL = locale === "ar";
  const [editing, setEditing] = useState(false);
  const [state, action] = useActionState<UpdateProfileResult, FormData>(
    updateProfile,
    { ok: true },
  );

  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      {!editing ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--color-accent-dark)]">
              {isRTL ? "بياناتي" : "Profile"}
            </p>
            <h2 className="font-display text-2xl text-[var(--color-text)]">
              {initialName || (isRTL ? "بدون اسم" : "(no name)")}
            </h2>
            <p
              className="font-mono text-[12px] text-[var(--color-text-secondary)]"
              dir="ltr"
            >
              {email}
            </p>
            <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">
              {isRTL ? "عضو منذ " : "Member since "}
              {new Date(memberSince).toLocaleDateString(
                isRTL ? "ar-EG" : "en-US",
                { year: "numeric", month: "long" },
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-4 py-2 text-xs font-medium text-[var(--color-text)] transition hover:border-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            >
              <Pencil className="h-3.5 w-3.5" />
              {isRTL ? "تعديل" : "Edit"}
            </button>
            <form action={signOut}>
              <input type="hidden" name="locale" value={locale} />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-4 py-2 text-xs font-medium text-[var(--color-text-secondary)] transition hover:border-[var(--color-error)] hover:text-[var(--color-error)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-error)]"
              >
                <LogOut className="h-3.5 w-3.5" />
                {isRTL ? "تسجيل خروج" : "Sign out"}
              </button>
            </form>
          </div>
        </div>
      ) : (
        <form action={action} className="space-y-4">
          <input type="hidden" name="locale" value={locale} />
          <div className={isRTL ? "text-right" : undefined}>
            <label
              htmlFor="profile-name"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]"
            >
              {isRTL ? "الاسم" : "Name"}
            </label>
            <input
              id="profile-name"
              name="name"
              type="text"
              required
              minLength={2}
              maxLength={80}
              defaultValue={initialName}
              autoComplete="name"
              autoFocus
              className={cn(
                "block w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-sm text-[var(--color-text)] transition focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30",
                isRTL && "text-right",
              )}
            />
          </div>
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              {isRTL ? "البريد الإلكتروني" : "Email"}
            </p>
            <p
              className="font-mono text-[12px] text-[var(--color-text-secondary)]"
              dir="ltr"
            >
              {email}
            </p>
            <p className="mt-1 text-[11px] text-[var(--color-text-secondary)]">
              {isRTL
                ? "لتغيير البريد، تواصل معنا."
                : "Contact us to change your email."}
            </p>
          </div>

          {state && !state.ok && (
            <p
              role="alert"
              className="rounded-md border border-[var(--color-error)]/40 bg-[var(--color-error)]/10 px-3 py-2 text-xs text-[var(--color-error)]"
            >
              {state.error}
            </p>
          )}
          {state && state.ok && (
            <p
              role="status"
              className="rounded-md border border-[var(--color-success)]/40 bg-[var(--color-success)]/10 px-3 py-2 text-xs text-[var(--color-success)]"
            >
              {isRTL ? "تم حفظ التغييرات ✓" : "Saved ✓"}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <SaveButton locale={locale} />
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-4 py-2 text-xs font-medium text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-[var(--color-text)]"
            >
              <X className="h-3.5 w-3.5" />
              {isRTL ? "إلغاء" : "Cancel"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

function SaveButton({ locale }: { locale: Locale }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-2 text-xs font-semibold text-white transition hover:bg-[var(--color-primary)]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {locale === "ar" ? "حفظ" : "Save"}
    </button>
  );
}
