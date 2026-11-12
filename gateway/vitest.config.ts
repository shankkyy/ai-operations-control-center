import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // All test files share one real Postgres test DB; running files in
    // parallel lets one file's beforeEach(truncateAll) race another's data.
    fileParallelism: false,
    globalSetup: ["./tests/globalSetup.ts"],
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**"],
      exclude: ["src/index.ts", "src/workers/index.ts", "src/scripts/**"],
    },
    hookTimeout: 30_000,
    testTimeout: 15_000,
  },
});
