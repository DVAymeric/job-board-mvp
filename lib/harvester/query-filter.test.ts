import { describe, it, expect, vi } from "vitest";
import {
  extractDepartement,
  departmentFromLabel,
  haversineDistanceKm,
  resolveLocationVerdict,
  acceptableLocationsFromLocations,
  offerMatchesQuery,
  type AcceptableLocation,
} from "@/lib/harvester/query-filter";
import type { NormalizedOffer } from "@/lib/harvester/normalized-offer";
import type { HarvestQuery } from "@/lib/harvester/harvest-query";

function makeOffer(overrides: Partial<NormalizedOffer> = {}): NormalizedOffer {
  return {
    id: "offer-1",
    source: "fake",
    sourceOfferId: "1",
    canonicalUrl: "https://example.com/jobs/1",
    title: "Développeur web en alternance",
    company: { name: "Acme", normalizedName: "acme" },
    location: { label: "Lille 59000", city: "Lille", department: "59" },
    contractType: "apprentissage",
    romeCodes: ["M1805"],
    descriptionText: "Rejoignez notre équipe React/Node.",
    firstSeenAt: "2026-08-15T00:00:00.000Z",
    lastSeenAt: "2026-08-15T00:00:00.000Z",
    lifecycle: "active",
    dedupKey: "dedup-1",
    sourceRefs: [{ source: "fake", sourceOfferId: "1", canonicalUrl: "https://example.com/jobs/1" }],
    rawPayload: {},
    ...overrides,
  };
}

function makeQuery(overrides: Partial<HarvestQuery> = {}): HarvestQuery {
  return {
    campaignId: "campaign-1",
    keywords: [],
    romeCodes: [],
    location: { label: "Lille 59000", lat: 50.63, lng: 3.05, radiusKm: 30 },
    contractTypes: [],
    ...overrides,
  };
}

const LILLE: AcceptableLocation = { label: "Lille 59000", lat: 50.630951, lng: 3.045391, radiusKm: 30 };
const AMIENS: AcceptableLocation = { label: "Amiens 80000", lat: 49.903041, lng: 2.292605, radiusKm: 30 };
// Lens (62) : ~27km de Lille, dans le rayon de 30km mais dans un département voisin — vérifie
// que le rayon prime sur l'égalité de département.
const LENS_LAT = 50.4331;
const LENS_LNG = 2.8319;
const MARSEILLE_LAT = 43.2965;
const MARSEILLE_LNG = 5.3698;

describe("extractDepartement", () => {
  it("extrait les 2 premiers chiffres d'un code postal présent dans le label", () => {
    expect(extractDepartement("Lille 59000")).toBe("59");
    expect(extractDepartement("Paris 75001")).toBe("75");
  });

  it("retourne undefined si aucun code postal n'est présent", () => {
    expect(extractDepartement("Lille")).toBeUndefined();
  });
});

describe("departmentFromLabel", () => {
  it("extrait un département via departmentFromPostalCode (gère les DOM à 3 chiffres)", () => {
    expect(departmentFromLabel("Lille 59000")).toBe("59");
    expect(departmentFromLabel("Fort-de-France 97200")).toBe("972");
  });

  it("retourne undefined si aucun code postal n'est présent", () => {
    expect(departmentFromLabel("Lille")).toBeUndefined();
  });
});

describe("haversineDistanceKm", () => {
  it("retourne 0 pour des coordonnées identiques", () => {
    expect(haversineDistanceKm(50.63, 3.05, 50.63, 3.05)).toBe(0);
  });

  it("retourne une distance plausible entre deux villes connues (Lille -> Paris, ~220km)", () => {
    const distance = haversineDistanceKm(50.630951, 3.045391, 48.8566, 2.3522);
    expect(distance).toBeGreaterThan(200);
    expect(distance).toBeLessThan(240);
  });
});

describe("acceptableLocationsFromLocations", () => {
  it("reprend lat/lng/radiusKm tels quels, une entrée par localisation", () => {
    expect(
      acceptableLocationsFromLocations([
        { label: "Lille 59000", lat: 50.63, lng: 3.05, radiusKm: 30 },
        { label: "Amiens 80000", lat: 49.9, lng: 2.29, radiusKm: 30 },
      ]),
    ).toEqual([
      { label: "Lille 59000", lat: 50.63, lng: 3.05, radiusKm: 30 },
      { label: "Amiens 80000", lat: 49.9, lng: 2.29, radiusKm: 30 },
    ]);
  });
});

describe("resolveLocationVerdict", () => {
  it("accepte sans contrainte quand acceptable est vide", () => {
    expect(resolveLocationVerdict(makeOffer(), [])).toBe("matched");
  });

  describe("niveau 1 — rayon géographique (offre avec coordonnées, JOB-75)", () => {
    it("accepte une offre dans le rayon d'une localisation acceptable", () => {
      const offer = makeOffer({ location: { label: "Lille", city: "Lille", lat: 50.63, lng: 3.05 } });
      expect(resolveLocationVerdict(offer, [LILLE])).toBe("matched");
    });

    it("accepte une offre dans le rayon même si son département diffère (régression I-2)", () => {
      const offer = makeOffer({ location: { label: "Lens", city: "Lens", department: "62", lat: LENS_LAT, lng: LENS_LNG } });
      expect(resolveLocationVerdict(offer, [LILLE])).toBe("matched");
    });

    it("rejette (out-of-zone) une offre géolocalisée hors de tout rayon acceptable", () => {
      const offer = makeOffer({ location: { label: "Marseille", city: "Marseille", lat: MARSEILLE_LAT, lng: MARSEILLE_LNG } });
      expect(resolveLocationVerdict(offer, [LILLE])).toBe("out-of-zone");
    });
  });

  describe("niveau 2 — égalité de département (offre sans coordonnées, avec département résolu)", () => {
    it("accepte une offre dont le département est dans l'ensemble acceptable", () => {
      const offer = makeOffer({ location: { label: "Amiens 80000", city: "Amiens", department: "80" } });
      expect(resolveLocationVerdict(offer, [LILLE, AMIENS])).toBe("matched");
    });

    it("rejette (out-of-zone) une offre dont le département est hors de l'ensemble acceptable", () => {
      const offer = makeOffer({ location: { label: "Marseille 13000", city: "Marseille", department: "13" } });
      expect(resolveLocationVerdict(offer, [LILLE])).toBe("out-of-zone");
    });
  });

  describe("niveau 3 — nom de ville normalisé (offre sans coordonnées ni département, cas Workday)", () => {
    it("accepte un nom de ville nu correspondant au label d'une localisation acceptable", () => {
      const offer = makeOffer({ source: "workday", location: { label: "Lille", city: "Lille" } });
      expect(resolveLocationVerdict(offer, [LILLE])).toBe("matched");
    });

    it("est insensible à la casse et aux accents", () => {
      const offer = makeOffer({ source: "workday", location: { label: "AMIENS", city: "AMIENS" } });
      expect(resolveLocationVerdict(offer, [AMIENS])).toBe("matched");
    });

    // Régression du 2026-08-26 côté job-harvester : une ville reconnue mais différente doit
    // être "out-of-zone" (rejet normal), pas "unresolved" (fail-closed avec warning) — la ville
    // EST une information exploitable, même quand elle ne correspond à aucune localisation.
    it("est 'out-of-zone', pas 'unresolved', quand la ville est reconnue mais ne correspond à aucune localisation acceptable", () => {
      const offer = makeOffer({ source: "workday", location: { label: "Saint-Denis", city: "Saint-Denis" } });
      expect(resolveLocationVerdict(offer, [LILLE])).toBe("out-of-zone");
    });
  });

  describe("niveau 4 — fail-closed (aucune information de localisation exploitable)", () => {
    it("rejette (unresolved) une offre sans coordonnées, sans département et sans ville", () => {
      const offer = makeOffer({ location: { label: "", city: "" } });
      expect(resolveLocationVerdict(offer, [LILLE])).toBe("unresolved");
    });
  });
});

describe("offerMatchesQuery — contractTypes", () => {
  it("accepte l'offre si contractTypes est vide (pas de filtre)", () => {
    const offer = makeOffer({ contractType: "stage" });
    expect(offerMatchesQuery(offer, makeQuery({ contractTypes: [] }), [])).toEqual({ matches: true });
  });

  it("rejette l'offre si son contractType n'est pas dans la liste demandée", () => {
    const offer = makeOffer({ contractType: "stage" });
    expect(offerMatchesQuery(offer, makeQuery({ contractTypes: ["apprentissage"] }), [])).toEqual({
      matches: false,
      reason: "contractType",
    });
  });

  it("accepte l'offre si son contractType est dans la liste demandée", () => {
    const offer = makeOffer({ contractType: "stage" });
    expect(offerMatchesQuery(offer, makeQuery({ contractTypes: ["apprentissage", "stage"] }), [])).toEqual({
      matches: true,
    });
  });
});

describe("offerMatchesQuery — keywords", () => {
  it("accepte l'offre si keywords est vide (pas de filtre)", () => {
    const offer = makeOffer({ title: "Comptable", descriptionText: "Gestion de la paie" });
    expect(offerMatchesQuery(offer, makeQuery({ keywords: [] }), [])).toEqual({ matches: true });
  });

  it("accepte l'offre si le titre matche un mot-clé", () => {
    const offer = makeOffer({ title: "Développeur React", descriptionText: "Gestion de la paie" });
    expect(offerMatchesQuery(offer, makeQuery({ keywords: ["react"] }), [])).toEqual({ matches: true });
  });

  it("accepte l'offre si la description matche un mot-clé", () => {
    const offer = makeOffer({ title: "Comptable", descriptionText: "Stack technique : React/Node" });
    expect(offerMatchesQuery(offer, makeQuery({ keywords: ["node"] }), [])).toEqual({ matches: true });
  });

  it("rejette l'offre si ni le titre ni la description ne matchent aucun mot-clé", () => {
    const offer = makeOffer({ title: "Comptable", descriptionText: "Gestion de la paie" });
    expect(offerMatchesQuery(offer, makeQuery({ keywords: ["react", "node"] }), [])).toEqual({
      matches: false,
      reason: "keywords",
    });
  });

  it("matche sur un mot entier, pas une sous-chaîne (ex. 'react' ne matche pas 'reaction')", () => {
    const offer = makeOffer({ title: "Chargé de réaction opérationnelle", descriptionText: "" });
    expect(offerMatchesQuery(offer, makeQuery({ keywords: ["react"] }), [])).toEqual({
      matches: false,
      reason: "keywords",
    });
  });

  it("échappe les caractères spéciaux d'un mot-clé sans lever d'exception", () => {
    const offer = makeOffer({ title: "Développeur C++", descriptionText: "" });
    expect(() => offerMatchesQuery(offer, makeQuery({ keywords: ["c++"] }), [])).not.toThrow();
  });
});

describe("offerMatchesQuery — location", () => {
  it("accepte l'offre sans contrainte quand acceptableLocations est vide", () => {
    const offer = makeOffer({ location: { label: "Marseille 13000", city: "Marseille", department: "13" } });
    expect(offerMatchesQuery(offer, makeQuery(), [])).toEqual({ matches: true });
  });

  it("accepte l'offre si son département correspond à une localisation acceptable", () => {
    const offer = makeOffer({ location: { label: "Lille 59000", city: "Lille", department: "59" } });
    expect(offerMatchesQuery(offer, makeQuery(), [LILLE])).toEqual({ matches: true });
  });

  it("rejette (location_out_of_zone) l'offre si son département diffère de toute localisation acceptable", () => {
    const offer = makeOffer({ location: { label: "Paris 75001", city: "Paris", department: "75" } });
    expect(offerMatchesQuery(offer, makeQuery(), [LILLE])).toEqual({ matches: false, reason: "location_out_of_zone" });
  });

  it("rejette (location_unresolved), sans logger elle-même (JOB-76 : log agrégé à la charge de l'appelant), une offre sans aucune info de localisation exploitable", () => {
    const offer = makeOffer({ location: { label: "", city: "" } });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(offerMatchesQuery(offer, makeQuery(), [LILLE])).toEqual({ matches: false, reason: "location_unresolved" });
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("accepte via le rayon géographique une offre géolocalisée même hors département (WTTJ/LBA, JOB-75)", () => {
    const offer = makeOffer({ location: { label: "Lens", city: "Lens", department: "62", lat: LENS_LAT, lng: LENS_LNG } });
    expect(offerMatchesQuery(offer, makeQuery(), [LILLE])).toEqual({ matches: true });
  });

  it("accepte via le nom de ville une offre Workday sans coordonnées ni département", () => {
    const offer = makeOffer({ source: "workday", location: { label: "Lille", city: "Lille" } });
    expect(offerMatchesQuery(offer, makeQuery(), [LILLE])).toEqual({ matches: true });
  });
});

describe("offerMatchesQuery — combinaison", () => {
  it("accepte une offre conforme à contrat/mots-clés/localisation", () => {
    const offer = makeOffer();
    const query = makeQuery({ contractTypes: ["apprentissage"], keywords: ["react"] });
    expect(offerMatchesQuery(offer, query, [LILLE])).toEqual({ matches: true });
  });

  it("rejette dès le premier critère non conforme même si les autres passeraient", () => {
    const offer = makeOffer({ contractType: "stage", title: "Data Analyst" });
    const query = makeQuery({ contractTypes: ["apprentissage"], keywords: ["react"] });
    expect(offerMatchesQuery(offer, query, [LILLE])).toEqual({ matches: false, reason: "contractType" });
  });
});
