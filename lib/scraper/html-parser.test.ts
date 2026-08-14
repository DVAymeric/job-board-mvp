import { describe, expect, it } from "vitest";
import { extractJobMetadataFromHtml } from "@/lib/scraper/html-parser";

describe("extractJobMetadataFromHtml", () => {
  it("prefers og:title over the <title> tag", () => {
    const html = `
      <html><head>
        <title>Fallback Title</title>
        <meta property="og:title" content="Développeur Backend" />
      </head></html>
    `;
    expect(extractJobMetadataFromHtml(html).title).toBe("Développeur Backend");
  });

  it("falls back to the <title> tag when og:title is missing", () => {
    const html = `<html><head><title>  Ingénieur QA  </title></head></html>`;
    expect(extractJobMetadataFromHtml(html).title).toBe("Ingénieur QA");
  });

  it("extracts og:site_name as the company name", () => {
    const html = `<meta property="og:site_name" content="Acme Corp" />`;
    expect(extractJobMetadataFromHtml(html).companyName).toBe("Acme Corp");
  });

  it("handles meta attributes in any order (content before property)", () => {
    const html = `<meta content="Beta SAS" property="og:site_name" />`;
    expect(extractJobMetadataFromHtml(html).companyName).toBe("Beta SAS");
  });

  it("returns null title, companyName and descriptionText when nothing is found", () => {
    const html = `<html><body>No metadata here</body></html>`;
    expect(extractJobMetadataFromHtml(html)).toEqual({
      title: null,
      companyName: null,
      descriptionText: null,
    });
  });

  it("extracts og:description as the descriptionText", () => {
    const html = `<meta property="og:description" content="Rejoignez notre équipe backend." />`;
    expect(extractJobMetadataFromHtml(html).descriptionText).toBe(
      "Rejoignez notre équipe backend."
    );
  });

  it("falls back to meta name=description when og:description is missing", () => {
    const html = `<meta name="description" content="Poste basé à Lyon." />`;
    expect(extractJobMetadataFromHtml(html).descriptionText).toBe(
      "Poste basé à Lyon."
    );
  });

  it("decodes common HTML entities", () => {
    const html = `<meta property="og:title" content="R&amp;D Engineer &#39;Remote&#39;" />`;
    expect(extractJobMetadataFromHtml(html).title).toBe(
      "R&D Engineer 'Remote'"
    );
  });

  it("handles a literal '>' inside a quoted attribute value", () => {
    const html = `<meta property="og:title" content="Growth: 3 > 2 ans d'XP" />`;
    expect(extractJobMetadataFromHtml(html).title).toBe(
      "Growth: 3 > 2 ans d'XP"
    );
  });

  it("handles single-quoted attributes whose value contains a double quote", () => {
    const html = `<meta property='og:site_name' content='Rejoignez "les meilleurs"' />`;
    expect(extractJobMetadataFromHtml(html).companyName).toBe(
      'Rejoignez "les meilleurs"'
    );
  });

  it("ignores unrelated attributes and ordering noise around the meta tag", () => {
    const html = `<meta data-test="x" property="og:title" data-other='y' content="Ingénieur Cloud" class="hidden">`;
    expect(extractJobMetadataFromHtml(html).title).toBe("Ingénieur Cloud");
  });
});
