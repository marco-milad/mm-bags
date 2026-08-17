// Client-safe copy helpers for the InstaPay business-hours window.
// Deliberately NO "server-only" import: the formatter is used by both
// the expiry email (server) and InstapayInstructions (client), while
// the env-reading config function stays in the server-only
// instapay-expiry.ts (see the server-only split convention).

/** "ساعة عمل واحدة" / "ساعتين من وقت العمل" / "N ساعات عمل" / "N ساعة عمل" */
export function businessHoursDurationAr(hours: number): string {
  if (hours === 1) return "ساعة عمل واحدة";
  if (hours === 2) return "ساعتين من وقت العمل";
  if (hours <= 10) return `${hours} ساعات عمل`;
  return `${hours} ساعة عمل`;
}

export function businessHoursDurationEn(hours: number): string {
  return `${hours} business hour${hours === 1 ? "" : "s"}`;
}

/** Shown wherever the window is promised — single source for the schedule. */
export const BUSINESS_HOURS_LABEL_AR = "يومياً 11 ص – 10 م";
export const BUSINESS_HOURS_LABEL_EN = "daily 11 AM – 10 PM";
