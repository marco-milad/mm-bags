import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * OAuth + email-link callback handler.
 *
 * Flow:
 *   1. Supabase / Google bounces back here with `?code=…&next=…`
 *      (or `?next=…` for an already-authenticated email-confirm link).
 *   2. We exchange the code for a session via the server SSR client
 *      so the auth cookies get set.
 *   3. We redirect to `next` (relative paths only) or fall back to
 *      the storefront root.
 *
 * Lives outside the [locale] segment so the OAuth redirect URL is
 * a single stable path (Supabase + Google providers want one redirect
 * URI on file, not one per locale).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextRaw = url.searchParams.get("next");
  const locale = url.searchParams.get("locale") ?? "ar";

  // Relative-only — defends against `?next=https://attacker.com`.
  const next =
    nextRaw && nextRaw.startsWith("/") ? nextRaw : `/${locale}/account`;

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      // Fall through to the storefront with an error param so the
      // user sees something rather than a blank redirect loop.
      const back = new URL(`/${locale}/auth/login`, url.origin);
      back.searchParams.set("error", "callback_failed");
      return NextResponse.redirect(back);
    }
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
