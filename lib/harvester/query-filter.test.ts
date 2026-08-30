import { describe, it, expect } from "vitest";
import { extractDepartement, offerMatchesQuery } from "@/lib/harvester/query-filter";
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

describe("extractDepartement", () => {
  it("extrait les 2 premiers chiffres d'un code postal présent dans le label", () => {
    expect(extractDepartement("Lille 59000")).toBe("59");
    expect(extractDepartement("Paris 75001")).toBe("75");
  });

  it("retourne undefined si aucun code postal n'est présent", () => {
    expect(extractDepartement("Lille")).toBeUndefined();
  });
});

describe("offerMatchesQuery — contractTypes", () => {
  it("accepte l'offre si contractTypes est vide (pas de filtre)", () => {
    const offer = makeOffer({ contractType: "stage" });
    expect(offerMatchesQuery(offer, makeQuery({ contractTypes: [] }))).toEqual({ matches: true });
  });

  it("rejette l'offre si son contractType n'est pas dans la liste demandée", () => {
    const offer = makeOffer({ contractType: "stage" });
    expect(offerMatchesQuery(offer, makeQuery({ contractTypes: ["apprentissage"] }))).toEqual({
      matches: false,
      reason: "contractType",
    });
  });

  it("accepte l'offre si son contractType est dans la liste demandée", () => {
    const offer = makeOffer({ contractType: "stage" });
    expect(offerMatchesQuery(offer, makeQuery({ contractTypes: ["apprentissage", "stage"] }))).toEqual({
      matches: true,
    });
  });
});

describe("offerMatchesQuery — keywords", () => {
  it("accepte l'offre si keywords est vide (pas de filtre)", () => {
    const offer = makeOffer({ title: "Comptable", descriptionText: "Gestion de la paie" });
    expect(offerMatchesQuery(offer, makeQuery({ keywords: [] }))).toEqual({ matches: true });
  });

  it("accepte l'offre si le titre matche un mot-clé", () => {
    const offer = makeOffer({ title: "Développeur React", descriptionText: "Gestion de la paie" });
    expect(offerMatchesQuery(offer, makeQuery({ keywords: ["react"] }))).toEqual({ matches: true });
  });

  it("accepte l'offre si la description matche un mot-clé", () => {
    const offer = makeOffer({ title: "Comptable", descriptionText: "Stack technique : React/Node" });
    expect(offerMatchesQuery(offer, makeQuery({ keywords: ["node"] }))).toEqual({ matches: true });
  });

  it("rejette l'offre si ni le titre ni la description ne matchent aucun mot-clé", () => {
    const offer = makeOffer({ title: "Comptable", descriptionText: "Gestion de la paie" });
    expect(offerMatchesQuery(offer, makeQuery({ keywords: ["react", "node"] }))).toEqual({
      matches: false,
      reason: "keywords",
    });
  });

  it("matche sur un mot entier, pas une sous-chaîne (ex. 'react' ne matche pas 'reaction')", () => {
    const offer = makeOffer({ title: "Chargé de réaction opérationnelle", descriptionText: "" });
    expect(offerMatchesQuery(offer, makeQuery({ keywords: ["react"] }))).toEqual({
      matches: false,
      reason: "keywords",
    });
  });

  it("échappe les caractères spéciaux d'un mot-clé sans lever d'exception", () => {
    // "\b" ne matche pas après un caractère non-alphanumérique final (limite connue de
    // l'approche \b...\b, pas spécifique à l'échappement) — ce test vérifie uniquement
    // l'absence de crash sur une regex mal formée sans l'échappement.
    const offer = makeOffer({ title: "Développeur C++", descriptionText: "" });
    expect(() => offerMatchesQuery(offer, makeQuery({ keywords: ["c++"] }))).not.toThrow();
  });
});

describe("offerMatchesQuery — location", () => {
  it("accepte l'offre si le département de la requête ne peut pas être déterminé", () => {
    const offer = makeOffer({ location: { label: "Lille", city: "Lille", department: "59" } });
    const query = makeQuery({ location: { label: "France entière", lat: 46.6, lng: 2.4, radiusKm: 500 } });
    expect(offerMatchesQuery(offer, query)).toEqual({ matches: true });
  });

  it("accepte l'offre si son département correspond à celui de la requête", () => {
    const offer = makeOffer({ location: { label: "Lille 59000", city: "Lille", department: "59" } });
    expect(offerMatchesQuery(offer, makeQuery())).toEqual({ matches: true });
  });

  it("rejette l'offre si son département diffère de celui de la requête", () => {
    const offer = makeOffer({ location: { label: "Paris 75001", city: "Paris", department: "75" } });
    expect(offerMatchesQuery(offer, makeQuery())).toEqual({ matches: false, reason: "department_mismatch" });
  });

  it("rejette (fail-closed) si l'offre n'a pas de département résolu, sans logger elle-même (JOB-76 : le log agrégé est à la charge de l'appelant)", () => {
    const offer = makeOffer({ location: { label: "quelque part", city: "quelque part" } });
    expect(offerMatchesQuery(offer, makeQuery())).toEqual({ matches: false, reason: "missing_department" });
  });
});

describe("offerMatchesQuery — combinaison", () => {
  it("accepte une offre conforme à contrat/mots-clés/localisation", () => {
    const offer = makeOffer();
    const query = makeQuery({ contractTypes: ["apprentissage"], keywords: ["react"] });
    expect(offerMatchesQuery(offer, query)).toEqual({ matches: true });
  });
});
