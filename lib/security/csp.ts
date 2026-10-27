/**
 * Content-Security-Policy — the "allowlist" kind, without nonces.
 *
 * A nonce-based policy would make every page dynamic (a fresh nonce per
 * request) and throw away the static/ISR caching the storefront relies on
 * (see the perf history), so script-src keeps 'unsafe-inline' for Next's
 * inline bootstrap scripts. What this policy DOES enforce:
 *   - scripts only from this origin and Cloudflare Turnstile;
 *   - the page may only send data (fetch/XHR/beacons/websockets) to this
 *     origin, our Supabase project and Turnstile — an injected skimmer
 *     cannot post checkout details to its own server;
 *   - images/media/fonts/frames only from the hosts the shop actually uses;
 *   - no plugins, no <base> hijack, forms post only to us, no framing.
 * Every host below was found by auditing the code AND the catalogue data
 * (2026-10-27). Adding a third-party asset means adding its host here.
 *
 * Pure; imported by next.config.ts. Tested in __tests__/csp.test.ts.
 */
export const CSP_REPORT_PATH = "/api/csp-report";

export function buildCsp(opts: {
  /** e.g. https://abc.supabase.co — images, video, auth/API calls. */
  supabaseOrigin?: string;
  /** next dev needs eval for fast refresh. */
  isDev?: boolean;
  /** Vercel preview deployments inject the Vercel toolbar. */
  isPreview?: boolean;
  /** Only on HTTPS hosting (Vercel): a local `next start` is plain http. */
  upgradeInsecure?: boolean;
}): string {
  const supabase = opts.supabaseOrigin ? [opts.supabaseOrigin] : [];
  const supabaseWs = opts.supabaseOrigin ? [opts.supabaseOrigin.replace(/^https:/, "wss:")] : [];
  const turnstile = "https://challenges.cloudflare.com";
  const toolbar = opts.isPreview ? ["https://vercel.live"] : [];

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", turnstile, ...toolbar, ...(opts.isDev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": [
      "'self'",
      "data:",
      "blob:",
      ...supabase,
      // Placeholder / imported imagery still referenced by the code.
      "https://images.unsplash.com",
      "https://cdn.shopify.com",
      "https://eg.jumia.is",
      ...toolbar,
    ],
    "media-src": ["'self'", ...supabase],
    "font-src": ["'self'", "data:"],
    "connect-src": ["'self'", ...supabase, ...supabaseWs, turnstile, ...toolbar, ...(opts.isDev ? ["ws:"] : [])],
    "frame-src": [turnstile, ...toolbar],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };

  const parts = Object.entries(directives).map(([k, v]) => `${k} ${v.join(" ")}`);
  if (opts.upgradeInsecure) parts.push("upgrade-insecure-requests");
  parts.push(`report-uri ${CSP_REPORT_PATH}`);
  return parts.join("; ");
}
