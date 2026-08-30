import { NextResponse, after, type NextRequest } from "next/server";
import { isbot } from "isbot";
import {
  COOKIE_OPTS,
  OPTOUT_COOKIE,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  touchVisitor,
  UUID_RE,
  VISITOR_COOKIE,
  VISITOR_MAX_AGE,
} from "@/lib/analytics/identity";

const LOCALES = ["ar", "en"] as const;
const DEFAULT_LOCALE = "ar";

function pickLocale(request: NextRequest): string {
  const accept = request.headers.get("accept-language") ?? "";
  const preferred = accept
    .split(",")
    .map((part) => part.trim().split(";")[0].toLowerCase().split("-")[0]);
  for (const lang of preferred) {
    if ((LOCALES as readonly string[]).includes(lang)) return lang;
  }
  return DEFAULT_LOCALE;
}

/**
 * Mint the analytics visitor and session cookies onto whatever response we are
 * about to return.
 *
 * Minting here rather than from client code removes the first-visit race: the
 * cookie exists before any script runs, so two beacons sent concurrently can
 * never mint two ids for one person.
 *
 * The response is passed in on purpose. The locale redirect below returns a
 * redirect, not NextResponse.next(), and a visitor landing on "/" gets that
 * redirect on their very first request — setting the cookies on the wrong
 * object would lose identity for exactly the visitors who arrive at the root.
 */
function attachIdentity(request: NextRequest, response: NextResponse) {
  // Never Set-Cookie for bots or opted-out visitors. Bots inflate every count,
  // and an opted-out visitor must have nothing written about them at all.
  if (
    request.cookies.get(OPTOUT_COOKIE)?.value === "1" ||
    isbot(request.headers.get("user-agent") ?? "")
  ) {
    return response;
  }

  let visitorId = request.cookies.get(VISITOR_COOKIE)?.value;
  const freshVisitor = !visitorId || !UUID_RE.test(visitorId);
  if (freshVisitor) {
    visitorId = crypto.randomUUID();
    response.cookies.set(VISITOR_COOKIE, visitorId, {
      ...COOKIE_OPTS,
      maxAge: VISITOR_MAX_AGE,
    });
  }

  const sessionId = request.cookies.get(SESSION_COOKIE)?.value;
  const freshSession = !sessionId || !UUID_RE.test(sessionId);
  // Re-set on every request so the 30-minute window rolls with activity.
  response.cookies.set(SESSION_COOKIE, freshSession ? crypto.randomUUID() : sessionId!, {
    ...COOKIE_OPTS,
    maxAge: SESSION_MAX_AGE,
  });

  // Write only when a cookie was actually minted: at most one row touch per
  // visitor per 30-minute inactivity window. Requests inside a live session do
  // no database work at all. after() keeps the write alive past the response
  // without delaying it.
  if (freshVisitor || freshSession) {
    const id = visitorId!;
    after(() => touchVisitor(id));
  }

  return response;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Assets, API routes and the admin area are not storefront navigations —
  // no identity, no cookie header on every crawl of a static file. Beacons to
  // /api/events read the cookie the page navigation already set.
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/admin") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    /\.[\w]+$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  const hasLocale = LOCALES.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
  if (hasLocale) return attachIdentity(request, NextResponse.next());

  const locale = pickLocale(request);
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return attachIdentity(request, NextResponse.redirect(url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
