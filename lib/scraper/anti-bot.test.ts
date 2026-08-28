import { describe, expect, it } from "vitest";
import { isBlockPageTitle } from "@/lib/scraper/anti-bot";

describe("isBlockPageTitle", () => {
  it("recognizes the bare 'Blocked' title returned by Indeed's bot protection", () => {
    expect(isBlockPageTitle("Blocked")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isBlockPageTitle("blocked")).toBe(true);
    expect(isBlockPageTitle("BLOCKED")).toBe(true);
  });

  it("recognizes common Cloudflare/PerimeterX challenge titles", () => {
    expect(isBlockPageTitle("Just a moment...")).toBe(true);
    expect(isBlockPageTitle("Attention Required! | Cloudflare")).toBe(true);
  });

  it("recognizes generic access-denied titles", () => {
    expect(isBlockPageTitle("Access Denied")).toBe(true);
    expect(isBlockPageTitle("403 Forbidden")).toBe(true);
  });

  it("does not flag a real job title", () => {
    expect(isBlockPageTitle("Développeur Backend (H/F)")).toBe(false);
  });

  it("does not flag a real job title that merely contains a similar word", () => {
    expect(isBlockPageTitle("Ingénieur sécurité réseau — accès et pare-feu")).toBe(false);
  });
});
