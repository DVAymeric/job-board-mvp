import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

try {
  process.loadEnvFile();
} catch {
  // No .env file (e.g. CI) — DATABASE_URL is expected to be set another way.
}

afterEach(cleanup);
