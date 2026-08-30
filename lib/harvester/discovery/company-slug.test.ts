import { describe, expect, it } from "vitest";
import { companySlug } from "@/lib/harvester/discovery/company-slug";

describe("companySlug", () => {
  it("normalizes and hyphenates a multi-word company name", () => {
    expect(companySlug("Acme One")).toBe("acme-one");
  });

  it("strips accents, case, and legal suffixes like normalizeCompanyName", () => {
    expect(companySlug("Décathlon SAS")).toBe("decathlon");
  });

  it("returns an empty string for a legal-suffix-only name", () => {
    expect(companySlug("SAS")).toBe("");
  });
});
