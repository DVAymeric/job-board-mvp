import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { exactDedupKeyFromSource } from "@/lib/harvester/dedup-key";
import { normalizeJsonLdOffer } from "@/lib/harvester/connectors/jsonld-generic/normalize";

const fixturesDir = path.resolve(fileURLToPath(import.meta.url), "../__fixtures__");

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(path.join(fixturesDir, name), "utf-8"));
}

const pageUrl = "https://careers.acmedata.example/jobs/alternance-developpeur-data-042";

function loadRawOfferPayload(): { pageUrl: string; jobPosting: unknown } {
  return { pageUrl, jobPosting: loadFixture("job-posting.json") };
}

describe("normalizeJsonLdOffer", () => {
  it("maps standard schema.org/JobPosting fields to a NormalizedOffer", () => {
    const offer = normalizeJsonLdOffer({ source: "jsonld-generic", payload: loadRawOfferPayload() });

    expect(offer.source).toBe("jsonld-generic");
    expect(offer.title).toBe("Alternance Développeur Data (H/F)");
    expect(offer.sourceOfferId).toBe("ACME-DATA-2026-042");
    expect(offer.company.name).toBe("AcmeData");
    expect(offer.company.normalizedName).toBe("acmedata");
    expect(offer.location.city).toBe("Lille");
    expect(offer.location.postalCode).toBe("59000");
    expect(offer.location.department).toBe("59");
    expect(offer.applyUrl).toBe("https://careers.acmedata.example/jobs/alternance-developpeur-data-042");
    expect(offer.canonicalUrl).toBe("https://careers.acmedata.example/jobs/alternance-developpeur-data-042");
    expect(offer.descriptionText).toContain("Développement Python/SQL");
    expect(offer.descriptionHtml).toContain("<p>");
    expect(offer.postedAt).toBe("2026-08-10");
    expect(offer.expiresAt).toBe("2026-10-01");
    expect(offer.contractType).toBe("apprentissage");
  });

  it("falls back to the page URL when the JobPosting has no url field", () => {
    const raw = loadRawOfferPayload();
    const { url: _drop, ...jobPostingWithoutUrl } = raw.jobPosting as Record<string, unknown>;
    const offer = normalizeJsonLdOffer({ source: "jsonld-generic", payload: { ...raw, jobPosting: jobPostingWithoutUrl } });
    expect(offer.applyUrl).toBe(pageUrl);
  });

  it("falls back to a URL-derived sourceOfferId when identifier.value is absent", () => {
    const raw = loadRawOfferPayload();
    const { identifier: _drop, ...jobPostingWithoutIdentifier } = raw.jobPosting as Record<string, unknown>;
    const offer = normalizeJsonLdOffer({ source: "jsonld-generic", payload: { ...raw, jobPosting: jobPostingWithoutIdentifier } });
    expect(offer.sourceOfferId).toBe("/jobs/alternance-developpeur-data-042");
  });

  it("throws on a payload that fails schema validation", () => {
    expect(() => normalizeJsonLdOffer({ source: "jsonld-generic", payload: { nope: true } })).toThrow();
  });

  it("never leaks a recruiter contact field into rawPayload, even if present in the source JSON-LD (whitelist by construction)", () => {
    const raw = loadRawOfferPayload();
    const jobPostingWithPii = {
      ...(raw.jobPosting as Record<string, unknown>),
      applicationContact: { email: "jean@example.com", telephone: "0600000000" },
    };
    const offer = normalizeJsonLdOffer({ source: "jsonld-generic", payload: { ...raw, jobPosting: jobPostingWithPii } });

    expect(offer.rawPayload).not.toHaveProperty("jobPosting.applicationContact");
    expect(JSON.stringify(offer.rawPayload)).not.toContain("jean@example.com");
  });

  it("derives a deterministic id from source and sourceOfferId (stable across DB reconstruction)", () => {
    const offer1 = normalizeJsonLdOffer({ source: "jsonld-generic", payload: loadRawOfferPayload() });
    const offer2 = normalizeJsonLdOffer({ source: "jsonld-generic", payload: loadRawOfferPayload() });

    expect(offer1.id).toBe(offer2.id);
    expect(offer1.id).toBe(exactDedupKeyFromSource("jsonld-generic", "ACME-DATA-2026-042"));
  });
});
