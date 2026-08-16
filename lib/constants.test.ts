import { describe, expect, it } from "vitest";
import { needsFollowUp, STATUS, STATUS_CONFIG, STATUS_ORDER } from "@/lib/constants";

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

describe("needsFollowUp", () => {
  it("returns false when the job is not in APPLIED status", () => {
    expect(
      needsFollowUp({
        status: STATUS.TO_APPLY,
        lastFollowUp: null,
        createdAt: daysAgo(30),
      })
    ).toBe(false);
  });

  it("returns false when APPLIED with a recent lastFollowUp", () => {
    expect(
      needsFollowUp({
        status: STATUS.APPLIED,
        lastFollowUp: daysAgo(2),
        createdAt: daysAgo(10),
      })
    ).toBe(false);
  });

  it("returns true when APPLIED with lastFollowUp at least FOLLOW_UP_DAYS ago", () => {
    expect(
      needsFollowUp({
        status: STATUS.APPLIED,
        lastFollowUp: daysAgo(7),
        createdAt: daysAgo(20),
      })
    ).toBe(true);
  });

  it("falls back to createdAt when lastFollowUp is null", () => {
    expect(
      needsFollowUp({
        status: STATUS.APPLIED,
        lastFollowUp: null,
        createdAt: daysAgo(9),
      })
    ).toBe(true);
  });

  it("returns false when falling back to a recent createdAt", () => {
    expect(
      needsFollowUp({
        status: STATUS.APPLIED,
        lastFollowUp: null,
        createdAt: daysAgo(1),
      })
    ).toBe(false);
  });
});

function extractLightHex(className: string): string {
  // Première couleur hex de la classe = variante claire (avant tout
  // préfixe dark:) — c'est elle qui doit être scannable au premier coup
  // d'œil sur le board en thème clair (par défaut).
  const match = className.match(/#[0-9a-fA-F]{3,8}/);
  if (!match) throw new Error(`No hex color found in "${className}"`);
  return match[0].toLowerCase();
}

describe("STATUS_CONFIG — couleurs distinctes par statut (pastilles voyantes)", () => {
  it("gives each status a visually distinct text color (no two statuses share a hex)", () => {
    const hexes = STATUS_ORDER.map(
      (status) => extractLightHex(STATUS_CONFIG[status].textClassName)
    );
    expect(new Set(hexes).size).toBe(hexes.length);
  });

  it("keeps the existing violet for INTERVIEW (already used on the column accent)", () => {
    expect(extractLightHex(STATUS_CONFIG.INTERVIEW.textClassName)).toBe("#783f8e");
  });

  it("does not style the status label as a filled pill (text color only, no background)", () => {
    for (const status of STATUS_ORDER) {
      expect(STATUS_CONFIG[status].textClassName).not.toMatch(/\bbg-/);
    }
  });

  it("keeps the left accent border color in sync with the status text color", () => {
    for (const status of STATUS_ORDER) {
      expect(extractLightHex(STATUS_CONFIG[status].accentBorderLeftClassName)).toBe(
        extractLightHex(STATUS_CONFIG[status].textClassName)
      );
    }
  });
});
