import { describe, it, expect } from "vitest";
import type { HarvestedOffer } from "@prisma/client";
import { harvestedOfferToNormalizedOffer, normalizedOfferToHarvestedOfferData } from "@/lib/harvester/offer-mapper";
import { exactDedupKeyFromSource } from "@/lib/harvester/dedup-key";
import type { NormalizedOffer } from "@/lib/harvester/normalized-offer";

function makeOffer(overrides: Partial<NormalizedOffer> = {}): NormalizedOffer {
  return {
    id: exactDedupKeyFromSource("smartrecruiters", "abc"),
    source: "smartrecruiters",
    sourceOfferId: "abc",
    originSource: "hellowork",
    canonicalUrl: "https://example.com/jobs/1",
    applyUrl: "https://example.com/apply/1",
    title: "Data Analyst",
    company: { name: "Acme SAS", normalizedName: "acme", siret: "123", website: "https://acme.example" },
    location: { label: "Lille 59000", city: "Lille", postalCode: "59000", department: "59", lat: 50.63, lng: 3.05 },
    contractType: "apprentissage",
    durationMonths: 12,
    startDate: "2026-09-01",
    romeCodes: ["M1403"],
    descriptionText: "desc",
    descriptionHtml: "<p>desc</p>",
    salary: { min: 1000, max: 1200, period: "monthly", currency: "EUR" },
    remotePolicy: "hybrid",
    postedAt: "2026-08-01",
    expiresAt: "2026-11-01",
    firstSeenAt: "2026-08-10T00:00:00.000Z",
    lastSeenAt: "2026-08-12T00:00:00.000Z",
    lifecycle: "active",
    dedupKey: "src:xyz",
    sourceRefs: [{ source: "smartrecruiters", sourceOfferId: "abc", canonicalUrl: "https://example.com/jobs/1" }],
    rawPayload: { title: "Data Analyst" },
    ...overrides,
  };
}

// Simule une ligne HarvestedOffer telle que le client Prisma la renverrait — construite à
// partir de normalizedOfferToHarvestedOfferData plutôt qu'un vrai insert (test unitaire, pas
// d'intégration ; voir lib/harvester-schema.integration.test.ts pour le vrai round-trip DB).
function toFakeRow(offer: NormalizedOffer): HarvestedOffer {
  const data = normalizedOfferToHarvestedOfferData(offer, "user-1", "campaign-1");
  return {
    id: "row-uuid-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    importedJobId: null,
    ...data,
  } as HarvestedOffer;
}

describe("normalizedOfferToHarvestedOfferData / harvestedOfferToNormalizedOffer", () => {
  it("round-trips every field of a fully-populated NormalizedOffer", () => {
    const offer = makeOffer();
    const row = toFakeRow(offer);
    const roundTripped = harvestedOfferToNormalizedOffer(row);

    expect(roundTripped).toEqual(offer);
  });

  it("round-trips a minimal NormalizedOffer with only required fields", () => {
    const offer = makeOffer({
      originSource: undefined,
      applyUrl: undefined,
      durationMonths: undefined,
      startDate: undefined,
      descriptionHtml: undefined,
      salary: undefined,
      remotePolicy: undefined,
      postedAt: undefined,
      expiresAt: undefined,
      company: { name: "Acme", normalizedName: "acme" },
      location: { label: "Lille", city: "Lille" },
    });
    const row = toFakeRow(offer);
    const roundTripped = harvestedOfferToNormalizedOffer(row);

    expect(roundTripped).toEqual(offer);
  });

  it("maps contractType/remotePolicy/lifecycle to the uppercase Prisma enums", () => {
    const offer = makeOffer({ contractType: "stage", remotePolicy: "remote", lifecycle: "dead_link" });
    const data = normalizedOfferToHarvestedOfferData(offer, "user-1", "campaign-1");

    expect(data.contractType).toBe("STAGE");
    expect(data.remotePolicy).toBe("REMOTE");
    expect(data.lifecycle).toBe("DEAD_LINK");
  });

  it("scopes the create data to the given userId and campaignId", () => {
    const data = normalizedOfferToHarvestedOfferData(makeOffer(), "user-42", "campaign-7");
    expect(data.userId).toBe("user-42");
    expect(data.campaignId).toBe("campaign-7");
  });
});
