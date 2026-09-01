import { describe, expect, it } from "vitest";
import { getSourceLabel, SOURCE_LABELS } from "@/lib/harvester/source-labels";

describe("getSourceLabel", () => {
  it("maps every registered connector id to a human-readable label", () => {
    expect(getSourceLabel("francetravail")).toBe("France Travail");
    expect(getSourceLabel("labonnealternance")).toBe("La Bonne Alternance");
    expect(getSourceLabel("workday")).toBe("Workday");
    expect(getSourceLabel("smartrecruiters")).toBe("SmartRecruiters");
    expect(getSourceLabel("talentsoft")).toBe("Talentsoft");
    expect(getSourceLabel("digitalrecruiters")).toBe("DigitalRecruiters");
    expect(getSourceLabel("welcometothejungle")).toBe("Welcome to the Jungle");
  });

  it("falls back to the raw source code for an unknown source", () => {
    expect(getSourceLabel("unknown-connector")).toBe("unknown-connector");
  });

  it("keeps every SOURCE_LABELS entry non-empty", () => {
    for (const label of Object.values(SOURCE_LABELS)) {
      expect(label.trim().length).toBeGreaterThan(0);
    }
  });
});
