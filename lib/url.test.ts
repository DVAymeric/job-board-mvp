import { describe, expect, it } from "vitest";
import { normalizeUrl } from "@/lib/url";

describe("normalizeUrl", () => {
  it("adds https protocol when missing", () => {
    expect(normalizeUrl("example.com/job")).toBe("https://example.com/job");
  });

  it("throws on empty input", () => {
    expect(() => normalizeUrl("   ")).toThrow("URL invalide");
  });
});
