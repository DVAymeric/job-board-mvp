import { describe, expect, it } from "vitest";
import { formatSalary, normalizeAnnualSalary } from "@/lib/salary";

describe("normalizeAnnualSalary", () => {
  it("returns the amount as-is for an annual salary", () => {
    expect(normalizeAnnualSalary(45000, "ANNUAL")).toBe(45000);
  });

  it("annualizes a daily rate using the average working days per year", () => {
    expect(normalizeAnnualSalary(500, "DAILY_RATE")).toBe(500 * 218);
  });

  it("returns null when the amount is null", () => {
    expect(normalizeAnnualSalary(null, "ANNUAL")).toBeNull();
  });

  it("returns null when the type is null", () => {
    expect(normalizeAnnualSalary(45000, null)).toBeNull();
  });
});

describe("formatSalary", () => {
  it("formats an annual salary with its label", () => {
    expect(formatSalary(45000, "ANNUAL")).toBe("45 000 €/an");
  });

  it("formats a daily rate with its label", () => {
    expect(formatSalary(500, "DAILY_RATE")).toBe("500 €/j (TJM)");
  });

  it("returns a placeholder when unset", () => {
    expect(formatSalary(null, null)).toBe("—");
  });
});
