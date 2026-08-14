import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    // Integration tests need a live Postgres (docker-compose, JOB-82) and run
    // separately via `npm run test:integration` — see vitest.integration.config.mts.
    // e2e/ uses @playwright/test's own runner (`npm run test:e2e`), not Vitest.
    exclude: ["**/node_modules/**", "**/*.integration.test.ts", "e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      exclude: [
        "**/node_modules/**",
        "**/*.config.*",
        "**/*.d.ts",
        "**/*.test.{ts,tsx}",
        "**/*.integration.test.ts",
        "e2e/**",
        "app/generated/**",
        "prisma/**",
        "vitest.setup.ts",
        "vitest.integration.setup.ts",
      ],
      // 70% comme point de départ raisonnable (JOB-106) — pas 100% d'emblée.
      // À relever progressivement plutôt qu'à assouplir si un futur ajout le
      // fait chuter.
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
  },
});
