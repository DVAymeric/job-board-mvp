import * as cheerio from "cheerio";
import { describe, expect, it } from "vitest";
import { extractJobPostingFromJsonLd } from "@/lib/scraper/json-ld";

function loadHtmlWithScripts(scripts: string[]): cheerio.CheerioAPI {
  const body = scripts
    .map((s) => `<script type="application/ld+json">${s}</script>`)
    .join("\n");
  return cheerio.load(`<html><head>${body}</head></html>`);
}

// Extraits représentatifs du JSON-LD JobPosting réel des 4 URLs de test
// (description tronquée pour la lisibilité de la fixture).
const HELLOWORK_APRIL_JOBPOSTING = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "JobPosting",
  title: "Data Scientist - Alternance H/F",
  description: "<h2>Les missions du poste</h2><p>APRIL est le leader...</p>",
  url: "https://www.hellowork.com/fr-fr/emplois/77470352.html",
  datePosted: "2026-08-01T00:13:16Z",
  employmentType: ["INTERN", "FULL_TIME"],
  hiringOrganization: {
    "@type": "Organization",
    name: "APRIL",
    sameAs: "https://www.hellowork.com/fr-fr/entreprises/april-34481.html",
    logo: "https://f.hellowork.com/img/entreprises/160_160/192639.png",
  },
  jobLocation: {
    "@type": "Place",
    address: {
      "@type": "PostalAddress",
      addressCountry: "FR",
      addressLocality: "Lyon",
      addressRegion: "Auvergne-Rhône-Alpes",
      postalCode: "69006",
    },
  },
});

const HELLOWORK_RUBIX_JOBPOSTING = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "JobPosting",
  title: "Apprenti Pricing Data Analyst - Lyon H/F",
  hiringOrganization: { "@type": "Organization", name: "Rubix France" },
});

const METEOJOB_FIDUCIAL_JOBPOSTING = JSON.stringify({
  "@context": "https://schema.org/",
  "@type": "JobPosting",
  title: "Responsable Trade Marketing (Lyon) H/F",
  url: "https://www.meteojob.com/jobs/54822806",
  employmentType: "FULL_TIME",
  hiringOrganization: {
    "@type": "Organization",
    name: "Fiducial",
    logo: "https://www.meteojob.com/images/7/4/3/10347_IMAGE_SMALL.png?1410342176000",
    sameAs: "https://www.meteojob.com/pages-entreprises/emploi-Fiducial-e-10347",
  },
  jobLocation: {
    "@type": "Place",
    address: { "@type": "PostalAddress", addressLocality: "Lyon", addressCountry: "FR" },
  },
});

const METEOJOB_LHH_JOBPOSTING = JSON.stringify({
  "@context": "https://schema.org/",
  "@type": "JobPosting",
  title: "Responsable Supply Chain (h/f)",
  hiringOrganization: { "@type": "Organization", name: "LHH Recruitment Solutions" },
});

describe("extractJobPostingFromJsonLd", () => {
  it("extracts title + hiringOrganization.name from the real HelloWork/APRIL fixture", () => {
    const $ = loadHtmlWithScripts([HELLOWORK_APRIL_JOBPOSTING]);
    expect(extractJobPostingFromJsonLd($)).toMatchObject({
      title: "Data Scientist - Alternance H/F",
      companyName: "APRIL",
      companyLogo: "https://f.hellowork.com/img/entreprises/160_160/192639.png",
      jobLocation: "Lyon",
      datePosted: "2026-08-01T00:13:16Z",
      employmentType: "INTERN, FULL_TIME",
    });
  });

  it("extracts title + hiringOrganization.name from the real HelloWork/Rubix fixture", () => {
    const $ = loadHtmlWithScripts([HELLOWORK_RUBIX_JOBPOSTING]);
    expect(extractJobPostingFromJsonLd($)).toMatchObject({
      title: "Apprenti Pricing Data Analyst - Lyon H/F",
      companyName: "Rubix France",
    });
  });

  it("extracts title + hiringOrganization.name from the real Meteojob/Fiducial fixture", () => {
    const $ = loadHtmlWithScripts([METEOJOB_FIDUCIAL_JOBPOSTING]);
    expect(extractJobPostingFromJsonLd($)).toMatchObject({
      title: "Responsable Trade Marketing (Lyon) H/F",
      companyName: "Fiducial",
      employmentType: "FULL_TIME",
    });
  });

  it("extracts title + hiringOrganization.name from the real Meteojob/LHH fixture", () => {
    const $ = loadHtmlWithScripts([METEOJOB_LHH_JOBPOSTING]);
    expect(extractJobPostingFromJsonLd($)).toMatchObject({
      title: "Responsable Supply Chain (h/f)",
      companyName: "LHH Recruitment Solutions",
    });
  });

  it("finds the JobPosting block among unrelated @type blocks (WebSite, Organization, BreadcrumbList)", () => {
    const $ = loadHtmlWithScripts([
      JSON.stringify({ "@context": "https://schema.org", "@type": "WebSite", name: "HelloWork" }),
      JSON.stringify({ "@context": "https://schema.org", "@type": "Organization", name: "HelloWork" }),
      JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [] }),
      HELLOWORK_APRIL_JOBPOSTING,
    ]);
    expect(extractJobPostingFromJsonLd($)?.companyName).toBe("APRIL");
  });

  it("handles a JobPosting wrapped in a JSON array", () => {
    const $ = loadHtmlWithScripts([
      `[${JSON.stringify({ "@type": "Organization", name: "HelloWork" })}, ${HELLOWORK_APRIL_JOBPOSTING}]`,
    ]);
    expect(extractJobPostingFromJsonLd($)?.companyName).toBe("APRIL");
  });

  it("handles a JobPosting wrapped in an @graph array", () => {
    const $ = loadHtmlWithScripts([
      JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
          { "@type": "Organization", name: "HelloWork" },
          JSON.parse(HELLOWORK_APRIL_JOBPOSTING),
        ],
      }),
    ]);
    expect(extractJobPostingFromJsonLd($)?.companyName).toBe("APRIL");
  });

  it("skips a malformed JSON-LD block and still finds a valid one in another script tag", () => {
    const $ = loadHtmlWithScripts(["{ not valid json", HELLOWORK_APRIL_JOBPOSTING]);
    expect(extractJobPostingFromJsonLd($)?.companyName).toBe("APRIL");
  });

  it("accepts hiringOrganization as a plain string", () => {
    const $ = loadHtmlWithScripts([
      JSON.stringify({ "@type": "JobPosting", title: "Poste", hiringOrganization: "Acme" }),
    ]);
    expect(extractJobPostingFromJsonLd($)?.companyName).toBe("Acme");
  });

  it("returns companyName null when hiringOrganization.name is missing, but keeps the title", () => {
    const $ = loadHtmlWithScripts([JSON.stringify({ "@type": "JobPosting", title: "Poste" })]);
    expect(extractJobPostingFromJsonLd($)).toMatchObject({ title: "Poste", companyName: null });
  });

  it("returns null when no application/ld+json script is present", () => {
    const $ = cheerio.load(`<html><head></head></html>`);
    expect(extractJobPostingFromJsonLd($)).toBeNull();
  });

  it("returns null when JSON-LD is present but none of the blocks are a JobPosting", () => {
    const $ = loadHtmlWithScripts([
      JSON.stringify({ "@type": "WebSite", name: "HelloWork" }),
      JSON.stringify({ "@type": "Organization", name: "HelloWork" }),
    ]);
    expect(extractJobPostingFromJsonLd($)).toBeNull();
  });

  it("returns null when the JobPosting block has neither a usable title nor a company name", () => {
    const $ = loadHtmlWithScripts([JSON.stringify({ "@type": "JobPosting" })]);
    expect(extractJobPostingFromJsonLd($)).toBeNull();
  });
});
