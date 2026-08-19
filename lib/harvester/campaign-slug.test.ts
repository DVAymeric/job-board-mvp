import { describe, it, expect } from "vitest";
import { slugifyKeywords } from "@/lib/harvester/campaign-slug";

describe("slugifyKeywords", () => {
  it("lowercases and joins keywords with dashes", () => {
    expect(slugifyKeywords(["Data Analyst", "BI"])).toBe("data-analyst-bi");
  });

  it("strips accents", () => {
    expect(slugifyKeywords(["Développeur web"])).toBe("developpeur-web");
  });

  it("replaces non-alphanumeric characters with dashes and collapses repeats", () => {
    expect(slugifyKeywords(["C++ / .NET!!"])).toBe("c-net");
  });

  it("trims leading and trailing dashes", () => {
    expect(slugifyKeywords(["-data-"])).toBe("data");
  });

  it("falls back to a default slug when there are no usable keywords", () => {
    expect(slugifyKeywords([])).toBe("campagne");
    expect(slugifyKeywords(["!!!"])).toBe("campagne");
  });

  it("truncates to leave room for a numeric collision suffix", () => {
    const longKeywords = ["mot".repeat(40)];
    const slug = slugifyKeywords(longKeywords);
    expect(slug.length).toBeLessThanOrEqual(60);
  });
});
