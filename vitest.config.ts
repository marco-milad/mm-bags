import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Minimal Vitest setup for H2 (server-side cart/price/stock validation).
// Tests target the PURE logic in lib/checkout/schema.ts, so a plain node
// environment is enough — no jsdom, no Next runtime. The `@` alias mirrors
// tsconfig paths so test imports match app imports.
export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
});
