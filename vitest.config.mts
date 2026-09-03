import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    // Au-delà du défaut de 5000ms (JOB-53) : la suite complète avec couverture v8
    // (instrumentation + nombreux fichiers en parallèle) fait parfois dépasser ce
    // seuil à des tests par ailleurs corrects, sous contention CPU — observé aussi
    // bien sur des tests pré-existants (job-dialog.test.tsx) que sur le nouveau
    // module harvester, jamais en isolation. Un vrai bug se traduirait par un
    // timeout systématique, pas intermittent selon la charge de la machine.
    testTimeout: 15000,
    // Integration tests need a live Postgres (docker-compose, JOB-82) and run
    // separately via `npm run test:integration` — see vitest.integration.config.mts.
    // e2e/ uses @playwright/test's own runner (`npm run test:e2e`), not Vitest.
    // .worktrees/ holds full nested checkouts (superpowers:using-git-worktrees) — without this,
    // running the suite from the main checkout also discovers and re-runs every worktree's own
    // copy of every test file, doubling counts and causing jsdom/window collisions between the
    // two concurrent copies of the same suite.
    exclude: ["**/node_modules/**", "**/*.integration.test.ts", "e2e/**", ".worktrees/**"],
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
