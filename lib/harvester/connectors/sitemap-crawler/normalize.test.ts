import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { normalizeJsonLdOffer as normalizeJsonLdOfferFromJsonLdGeneric } from "@/lib/harvester/connectors/jsonld-generic/normalize";
import { normalizeJsonLdOffer } from "@/lib/harvester/connectors/sitemap-crawler/normalize";

// sitemap-crawler réexporte tel quel le normalize.ts de jsonld-generic (voir normalize.ts) — cette
// fixture réutilise donc celle de jsonld-generic, puisqu'il s'agit du même schéma JobPosting que
// le connecteur rencontre, qu'il soit atteint via une URL configurée ou découvert par un crawl.
const fixturesDir = path.resolve(fileURLToPath(import.meta.url), "../../jsonld-generic/__fixtures__");

function loadRawOfferPayload(): { pageUrl: string; jobPosting: unknown } {
  const jobPosting = JSON.parse(readFileSync(path.join(fixturesDir, "job-posting.json"), "utf-8"));
  return { pageUrl: "https://careers.acmedata.example/jobs/alternance-developpeur-data-042", jobPosting };
}

describe("sitemap-crawler normalize.ts", () => {
  it("réexporte normalizeJsonLdOffer de jsonld-generic sans en modifier le comportement", () => {
    expect(normalizeJsonLdOffer).toBe(normalizeJsonLdOfferFromJsonLdGeneric);
  });

  it("mappe un JobPosting trouvé via un crawl de sitemap de la même façon que jsonld-generic", () => {
    const offer = normalizeJsonLdOffer({ source: "sitemap-crawler", payload: loadRawOfferPayload() });

    expect(offer.title).toBe("Alternance Développeur Data (H/F)");
    expect(offer.company.name).toBe("AcmeData");
    expect(offer.contractType).toBe("apprentissage");
  });

  it("lève une exception sur un payload qui échoue à la validation du schéma", () => {
    expect(() => normalizeJsonLdOffer({ source: "sitemap-crawler", payload: { nope: true } })).toThrow();
  });
});
