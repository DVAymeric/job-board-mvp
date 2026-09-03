import { describe, it, expect } from "vitest";
import { searchRomeReferentiel } from "@/lib/harvester/rome-search";

describe("searchRomeReferentiel", () => {
  it("returns an empty array for a query shorter than 2 characters", () => {
    expect(searchRomeReferentiel("d")).toEqual([]);
    expect(searchRomeReferentiel("")).toEqual([]);
  });

  it("finds the emerging code M1405 for 'data scientist', not only the parent M1403", () => {
    const matches = searchRomeReferentiel("data scientist");
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.some((m) => m.romeCode === "M1405")).toBe(true);
  });

  it("finds M1811 for 'data engineer'", () => {
    const matches = searchRomeReferentiel("data engineer");
    expect(matches.some((m) => m.romeCode === "M1811")).toBe(true);
  });

  it("is case- and accent-insensitive", () => {
    const lower = searchRomeReferentiel("developpeur web");
    const accented = searchRomeReferentiel("Développeur Web");
    expect(lower.length).toBeGreaterThan(0);
    expect(accented.length).toBeGreaterThan(0);
    expect(lower[0]?.libelle).toBe(accented[0]?.libelle);
  });

  it("respects the limit parameter", () => {
    const matches = searchRomeReferentiel("developpeur", 3);
    expect(matches.length).toBeLessThanOrEqual(3);
  });

  it("sorts results by descending score", () => {
    const matches = searchRomeReferentiel("data analyst");
    for (let i = 1; i < matches.length; i++) {
      expect(matches[i - 1]!.score).toBeGreaterThanOrEqual(matches[i]!.score);
    }
  });
});
