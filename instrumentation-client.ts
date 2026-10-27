import { config } from "zod";

// Zod 4 probes `new Function` to enable its JIT parser. Our CSP has no
// 'unsafe-eval' (lib/security/csp.ts), so the probe is blocked: Zod falls
// back fine, but the browser still files a CSP violation report on every
// page with a form. `jitless` skips the probe entirely. Synchronous and
// top-level so it runs before any schema is created.
config({ jitless: true });
