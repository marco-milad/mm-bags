import "server-only";

/**
 * Is "Continue with Google" actually switched on in Supabase Auth?
 *
 * Read from the project's public /auth/v1/settings (anon key) instead of a
 * hard-coded flag, so the button appears on its own the day the provider is
 * enabled in the dashboard — and never shows while a click would only end in
 * "provider is not enabled". Cached 5 minutes; any failure hides the button.
 */
export async function isGoogleAuthEnabled(): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;
  try {
    const res = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: key },
      next: { revalidate: 300 },
    });
    if (!res.ok) return false;
    const settings = (await res.json()) as { external?: { google?: boolean } };
    return settings.external?.google === true;
  } catch {
    return false;
  }
}
