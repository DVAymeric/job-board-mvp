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
  },
});
