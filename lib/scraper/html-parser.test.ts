import { describe, expect, it } from "vitest";
import { extractJobMetadataFromHtml } from "@/lib/scraper/html-parser";

const TEST_URL = "https://careers.example.com/job/42";

describe("extractJobMetadataFromHtml", () => {
  it("prefers og:title over the <title> tag", () => {
    const html = `
      <html><head>
        <title>Fallback Title</title>
        <meta property="og:title" content="Développeur Backend" />
      </head></html>
    `;
    expect(extractJobMetadataFromHtml(html, TEST_URL).title).toBe("Développeur Backend");
  });

  it("falls back to the <title> tag when og:title is missing", () => {
    const html = `<html><head><title>  Ingénieur QA  </title></head></html>`;
    expect(extractJobMetadataFromHtml(html, TEST_URL).title).toBe("Ingénieur QA");
  });

  it("extracts og:site_name as the company name", () => {
    const html = `<meta property="og:site_name" content="Acme Corp" />`;
    expect(extractJobMetadataFromHtml(html, TEST_URL).companyName).toBe("Acme Corp");
  });

  it("handles meta attributes in any order (content before property)", () => {
    const html = `<meta content="Beta SAS" property="og:site_name" />`;
    expect(extractJobMetadataFromHtml(html, TEST_URL).companyName).toBe("Beta SAS");
  });

  it("returns null title, companyName and descriptionText when nothing is found", () => {
    const html = `<html><body>No metadata here</body></html>`;
    expect(extractJobMetadataFromHtml(html, TEST_URL)).toEqual({
      title: null,
      companyName: null,
      descriptionText: null,
    });
  });

  it("extracts og:description as the descriptionText", () => {
    const html = `<meta property="og:description" content="Rejoignez notre équipe backend." />`;
    expect(extractJobMetadataFromHtml(html, TEST_URL).descriptionText).toBe(
      "Rejoignez notre équipe backend."
    );
  });

  it("falls back to meta name=description when og:description is missing", () => {
    const html = `<meta name="description" content="Poste basé à Lyon." />`;
    expect(extractJobMetadataFromHtml(html, TEST_URL).descriptionText).toBe(
      "Poste basé à Lyon."
    );
  });

  it("decodes common HTML entities", () => {
    const html = `<meta property="og:title" content="R&amp;D Engineer &#39;Remote&#39;" />`;
    expect(extractJobMetadataFromHtml(html, TEST_URL).title).toBe(
      "R&D Engineer 'Remote'"
    );
  });

  it("handles a literal '>' inside a quoted attribute value", () => {
    const html = `<meta property="og:title" content="Growth: 3 > 2 ans d'XP" />`;
    expect(extractJobMetadataFromHtml(html, TEST_URL).title).toBe(
      "Growth: 3 > 2 ans d'XP"
    );
  });

  it("handles single-quoted attributes whose value contains a double quote", () => {
    const html = `<meta property='og:site_name' content='Rejoignez "les meilleurs"' />`;
    expect(extractJobMetadataFromHtml(html, TEST_URL).companyName).toBe(
      'Rejoignez "les meilleurs"'
    );
  });

  it("ignores unrelated attributes and ordering noise around the meta tag", () => {
    const html = `<meta data-test="x" property="og:title" data-other='y' content="Ingénieur Cloud" class="hidden">`;
    expect(extractJobMetadataFromHtml(html, TEST_URL).title).toBe("Ingénieur Cloud");
  });
});

describe("extractJobMetadataFromHtml — découpage titre/entreprise (fix parsing)", () => {
  it("splits the company out of the <title> using the site-specific rule (LinkedIn)", () => {
    const html = `<html><head><title>Euro-Information recrute pour des postes de DEVELOPPEUR FULL STACK (H/F) (Nantes, Pays de la Loire, France) | LinkedIn</title></head></html>`;
    const result = extractJobMetadataFromHtml(html, "https://fr.linkedin.com/jobs/view/123");
    expect(result.title).toBe("DEVELOPPEUR FULL STACK (H/F)");
    expect(result.companyName).toBe("Euro-Information");
  });

  it("splits the company out of the <title> using the site-specific rule (Welcome to the Jungle)", () => {
    const html = `<html><head><title>Développeur Fullstack (F/H) - Meritis - CDI à Lille</title></head></html>`;
    const result = extractJobMetadataFromHtml(
      html,
      "https://www.welcometothejungle.com/fr/companies/meritis/jobs/xyz"
    );
    expect(result.title).toBe("Développeur Fullstack (F/H)");
    expect(result.companyName).toBe("Meritis");
  });

  it("leaves the company null on Indeed rather than guessing — only strips the site-brand suffix", () => {
    const html = `<html><head><title>Développeur Web Full Stack (H/F) - Clermont-Ferrand (63) - Indeed.com</title></head></html>`;
    const result = extractJobMetadataFromHtml(html, "https://fr.indeed.com/viewjob?jk=abc");
    expect(result.title).toBe("Développeur Web Full Stack (H/F) - Clermont-Ferrand (63)");
    expect(result.companyName).toBeNull();
  });

  it("does not duplicate the company name inside the title once og:site_name already provides it", () => {
    // og:site_name donne déjà l'entreprise ; le <title> brut la répète aussi
    // ("Meritis - ...") — le titre affiché doit rester nettoyé, sans le nom
    // de l'entreprise en double.
    const html = `
      <html><head>
        <title>Développeur Fullstack (F/H) - Meritis - CDI à Lille</title>
        <meta property="og:site_name" content="Meritis" />
      </head></html>
    `;
    const result = extractJobMetadataFromHtml(
      html,
      "https://www.welcometothejungle.com/fr/companies/meritis/jobs/xyz"
    );
    expect(result.companyName).toBe("Meritis");
    expect(result.title).toBe("Développeur Fullstack (F/H)");
    expect(result.title).not.toContain("Meritis");
  });
});
