import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";

describe("manifest", () => {
  it("declares an installable standalone app starting on the board", () => {
    const result = manifest();
    expect(result.display).toBe("standalone");
    expect(result.start_url).toBe("/board");
    expect(result.name).toBe("Suivi de candidatures");
    expect(result.short_name).toBe("Job Board");
  });

  it("sets brand colors matching the app's purple palette", () => {
    const result = manifest();
    expect(result.theme_color).toBe("#4f1271");
    expect(result.background_color).toBe("#f8f6fb");
  });

  it("provides at least a 192x192 and a 512x512 png icon", () => {
    const result = manifest();
    const sizes = (result.icons ?? []).map((icon) => icon.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
    for (const icon of result.icons ?? []) {
      expect(icon.type).toBe("image/png");
    }
  });
});
