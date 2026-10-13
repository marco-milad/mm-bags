/**
 * New-password rules shared by sign-up and password reset (same as
 * RegisterForm: 8+ characters, both fields equal). Returns a localized
 * message, or null when the password is acceptable. Pure — see
 * __tests__/password.test.ts.
 */
export const MIN_PASSWORD_LENGTH = 8;

export function newPasswordError(
  password: string,
  confirm: string,
  isAr: boolean,
): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return isAr
      ? "كلمة المرور لازم تكون 8 حروف على الأقل."
      : "Password must be at least 8 characters.";
  }
  if (password !== confirm) {
    return isAr ? "كلمتي المرور مش متطابقتين." : "Passwords don't match.";
  }
  return null;
}

/** Maps Supabase updateUser errors to shopper-facing copy. */
export function passwordUpdateErrorText(
  code: string | undefined,
  isAr: boolean,
): string {
  if (code === "same_password") {
    return isAr
      ? "دي نفس كلمة المرور القديمة — اختار واحدة جديدة."
      : "That's your current password — choose a new one.";
  }
  if (code === "weak_password") {
    return isAr
      ? "كلمة المرور ضعيفة — جرّب واحدة أطول فيها أرقام وحروف."
      : "That password is too weak — try a longer one with letters and numbers.";
  }
  if (code === "session_not_found" || code === "session_expired") {
    return isAr
      ? "الرابط انتهى. اطلب رابط جديد من «نسيت كلمة المرور»."
      : "This link has expired. Request a new one from “Forgot password”.";
  }
  return isAr ? "حصلت مشكلة، جرب تاني." : "Something went wrong — please try again.";
}
