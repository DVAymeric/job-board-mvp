import { defineConfig, devices } from "@playwright/test";

try {
  process.loadEnvFile();
} catch {
  // No .env file (e.g. CI) — env vars expected to be set another way.
}

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
        env: {
          ...process.env,
          // Autorise le scraper à atteindre le serveur de fixtures HTML
          // local (127.0.0.1) de la suite e2e/scraper-fixtures.spec.ts.
          // Scopé à ce process de dev éphémère spawné par Playwright —
          // jamais actif pour `npm run dev` en usage normal, ni en prod.
          ALLOW_LOOPBACK_FETCH_FOR_TESTS: "1",
        },
      },
});
