import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { exactDedupKeyFromSource } from "@/lib/harvester/dedup-key";
import { normalizeDigitalRecruitersOffer } from "@/lib/harvester/connectors/digitalrecruiters/normalize";

const fixturesDir = path.resolve(fileURLToPath(import.meta.url), "../__fixtures__");

function loadFixtureItems(): unknown[] {
  const parsed = JSON.parse(readFileSync(path.join(fixturesDir, "job-ads.json"), "utf-8"));
  return parsed.items;
}

function payloadFor(item: unknown) {
  return { domain: "joinus.decathlon.fr", item };
}

describe("normalizeDigitalRecruitersOffer", () => {
  it("maps fields, extracting postal code from the url slug", () => {
    const items = loadFixtureItems() as Array<Record<string, unknown>>;
    const cdi = items[0]!;
    const offer = normalizeDigitalRecruitersOffer({ source: "digitalrecruiters", payload: payloadFor(cdi) });

    expect(offer.source).toBe("digitalrecruiters");
    expect(offer.sourceOfferId).toBe("4553539");
    expect(offer.title).toBe("Conseiller-ère Vente Omnicanal (H/F) - Temps partiel");
    expect(offer.location.city).toBe("Bordeaux");
    expect(offer.location.postalCode).toBe("33300");
    expect(offer.location.department).toBe("33");
    // JOB-78-bis : "CDI" (champ contract) est désormais distingué d'"autre".
    expect(offer.contractType).toBe("cdi");
    expect(offer.company.name).toBe("Decathlon");
    expect(offer.canonicalUrl).toBe("https://joinus.decathlon.fr/fr/annonce/4553539-conseiller-ere-vente-omnicanal-hf-temps-partiel-33300-bordeaux");
  });

  it("classifies an apprenticeship contract label as apprentissage", () => {
    const items = loadFixtureItems() as Array<Record<string, unknown>>;
    const apprentice = items.find((item) => (item.job_ad_id as number) === 4553459)!;
    const offer = normalizeDigitalRecruitersOffer({ source: "digitalrecruiters", payload: payloadFor(apprentice) });

    expect(offer.contractType).toBe("apprentissage");
    expect(offer.location.city).toBe("Groslay");
    expect(offer.location.postalCode).toBe("95410");
  });

  it("classifies a stage contract label as stage (JOB-72)", () => {
    const items = loadFixtureItems() as Array<Record<string, unknown>>;
    const stage = items.find((item) => (item.job_ad_id as number) === 4552725)!;
    const offer = normalizeDigitalRecruitersOffer({ source: "digitalrecruiters", payload: payloadFor(stage) });

    expect(offer.contractType).toBe("stage");
  });

  it("throws on a payload that fails schema validation", () => {
    expect(() => normalizeDigitalRecruitersOffer({ source: "digitalrecruiters", payload: { nope: true } })).toThrow();
  });

  it("never leaks a field outside the whitelisted schema into rawPayload (no contact/recruiter field exposed by this endpoint)", () => {
    const items = loadFixtureItems() as Array<Record<string, unknown>>;
    const withPii = { ...items[0]!, contact_email: "jean@example.com" };
    const offer = normalizeDigitalRecruitersOffer({ source: "digitalrecruiters", payload: payloadFor(withPii) });

    expect(offer.rawPayload).not.toHaveProperty("contact_email");
  });

  it("derives a deterministic id from source and sourceOfferId", () => {
    const items = loadFixtureItems() as Array<Record<string, unknown>>;
    const offer1 = normalizeDigitalRecruitersOffer({ source: "digitalrecruiters", payload: payloadFor(items[0]) });
    const offer2 = normalizeDigitalRecruitersOffer({ source: "digitalrecruiters", payload: payloadFor(items[0]) });

    expect(offer1.id).toBe(offer2.id);
    expect(offer1.id).toBe(exactDedupKeyFromSource("digitalrecruiters", "4553539"));
  });
});
