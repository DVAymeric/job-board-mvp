import { describe, it, expect } from "vitest";
import { francetravailConnector } from "@/lib/harvester/connectors/francetravail/connector";
import type { HarvestQuery } from "@/lib/harvester/harvest-query";

function makeQuery(overrides: Partial<HarvestQuery> = {}): HarvestQuery {
  return {
    campaignId: "test",
    keywords: [],
    romeCodes: ["M1403"],
    location: { label: "Lille 59000", lat: 50.63, lng: 3.05, radiusKm: 30 },
    contractTypes: [],
    ...overrides,
  };
}

describe("francetravailConnector.supports", () => {
  // JOB-78-bis : l'API renvoie tout type de contrat (CDI/CDD/stage/alternance) pour un
  // codeROME+département donné — le tri par type de contrat se fait en aval via
  // query-filter.ts, comme pour tous les autres connecteurs. Un garde-fou ici qui exclut les
  // campagnes CDI/CDD-only rendrait France Travail silencieusement muet sur ces campagnes.
  it("supports a campaign requesting only cdi/cdd, not just apprentissage/professionnalisation", () => {
    expect(francetravailConnector.supports(makeQuery({ contractTypes: ["cdi", "cdd"] }))).toBe(true);
  });

  it("still supports an alternance-only campaign", () => {
    expect(francetravailConnector.supports(makeQuery({ contractTypes: ["apprentissage"] }))).toBe(true);
  });

  it("supports a campaign with no contractTypes filter", () => {
    expect(francetravailConnector.supports(makeQuery({ contractTypes: [] }))).toBe(true);
  });
});
