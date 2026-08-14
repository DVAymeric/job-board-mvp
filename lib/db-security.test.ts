import { describe, expect, it } from "vitest";
import { assertDatabaseUrlIsEncrypted } from "@/lib/db-security";

const NO_TLS_URL = "postgresql://user:pass@db.example.com:5432/db";

describe("assertDatabaseUrlIsEncrypted (JOB-120)", () => {
  it("does nothing outside production, even without TLS", () => {
    expect(() =>
      assertDatabaseUrlIsEncrypted(NO_TLS_URL, "development", "1")
    ).not.toThrow();
    expect(() => assertDatabaseUrlIsEncrypted(NO_TLS_URL, "test", "1")).not.toThrow();
  });

  it("does nothing for a local `npm run build`/CI build in NODE_ENV=production without VERCEL set — only a real Vercel deployment is checked", () => {
    // `next build` sets NODE_ENV=production locally and in CI too — without
    // this distinction, every local production-mode build/E2E run (against
    // a throwaway, TLS-less Postgres) would fail (observed: it did, before
    // this check was added).
    expect(() =>
      assertDatabaseUrlIsEncrypted(NO_TLS_URL, "production", undefined)
    ).not.toThrow();
  });

  it("does nothing when the URL is unset (not this function's job to validate presence)", () => {
    expect(() =>
      assertDatabaseUrlIsEncrypted(undefined, "production", "1")
    ).not.toThrow();
  });

  it("throws on a real Vercel production deployment when the URL has no TLS indicator", () => {
    expect(() => assertDatabaseUrlIsEncrypted(NO_TLS_URL, "production", "1")).toThrow(
      /TLS/
    );
  });

  it.each([
    "postgresql://user:pass@db.example.com/db?sslmode=require",
    "postgresql://user:pass@db.example.com/db?sslmode=verify-full",
    "postgresql://user:pass@db.example.com/db?sslmode=verify-ca",
    "postgresql://user:pass@db.example.com/db?ssl=true",
    "postgresql://user:pass@db.example.com/db?pgbouncer=true&sslmode=require",
  ])("accepts a production URL with a TLS indicator: %s", (url) => {
    expect(() => assertDatabaseUrlIsEncrypted(url, "production", "1")).not.toThrow();
  });

  it("rejects sslmode=disable explicitly, even though it matches the substring 'sslmode='", () => {
    expect(() =>
      assertDatabaseUrlIsEncrypted(
        "postgresql://user:pass@db.example.com/db?sslmode=disable",
        "production",
        "1"
      )
    ).toThrow(/TLS/);
  });
});
