import { defineConfig } from "vitest/config";

/**
 * Adapted from bluepass-app's config, with one difference: the tests that came
 * across with `lib/services/` are colocated next to their subject rather than
 * sitting in a top-level `tests/` folder, so `include` points at `lib/`.
 *
 * Without vitest installed, the colocated `*.test.ts` files fail `tsc --noEmit`
 * on a missing `vitest` module — hence this config exists rather than the tests
 * being deleted or excluded from type-checking.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": new URL(".", import.meta.url).pathname,
    },
  },
});
