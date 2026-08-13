import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Integration tests hit the real local Postgres (docker-compose, JOB-82) and
// are intentionally excluded from `npm test`/CI (no live database there) —
// run explicitly with `npm run test:integration` against a running local DB.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    setupFiles: ["./vitest.integration.setup.ts"],
    include: ["**/*.integration.test.ts"],
  },
});
