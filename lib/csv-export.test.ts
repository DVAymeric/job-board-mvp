import { describe, expect, it } from "vitest";
import { buildJobsCsv } from "@/lib/csv-export";

type ExportJob = Parameters<typeof buildJobsCsv>[0][number];

function job(overrides: Partial<ExportJob>): ExportJob {
  return {
    title: "Développeur",
    companyName: "Acme",
    status: "TO_APPLY",
    url: "https://example.com/job",
    archived: false,
    createdAt: new Date("2026-01-01T10:00:00Z"),
    lastFollowUp: null,
    tags: [],
    ...overrides,
  };
}

describe("buildJobsCsv", () => {
  it("starts with a UTF-8 BOM for Excel compatibility", () => {
    const csv = buildJobsCsv([job({})]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it("includes a clear header row", () => {
    const csv = buildJobsCsv([job({})]);
    const firstLine = csv.slice(1).split("\r\n")[0];
    expect(firstLine).toBe(
      "Titre,Entreprise,Statut,URL,Tags,Archivée,Créée le,Dernière relance"
    );
  });

  it("renders one row per job with joined tag names", () => {
    const csv = buildJobsCsv([
      job({
        title: "Développeur Backend",
        companyName: "Acme",
        status: "APPLIED",
        tags: [{ tag: { name: "Remote" } }, { tag: { name: "Senior" } }],
      }),
    ]);
    const rows = csv.slice(1).split("\r\n");
    expect(rows[1]).toContain("Développeur Backend");
    expect(rows[1]).toContain("Acme");
    expect(rows[1]).toContain("Postulé");
    expect(rows[1]).toContain("Remote; Senior");
  });

  it("includes archived jobs, marked as such", () => {
    const csv = buildJobsCsv([job({ archived: true })]);
    const rows = csv.slice(1).split("\r\n");
    expect(rows[1]).toContain("Oui");
  });

  it("quotes and escapes fields containing commas or quotes", () => {
    const csv = buildJobsCsv([job({ title: 'Dev, "Backend"' })]);
    const rows = csv.slice(1).split("\r\n");
    expect(rows[1]).toContain('"Dev, ""Backend"""');
  });

  it("leaves an empty cell for a null title/companyName/lastFollowUp", () => {
    const csv = buildJobsCsv([
      job({ title: null, companyName: null, lastFollowUp: null }),
    ]);
    const rows = csv.slice(1).split("\r\n");
    const cells = rows[1].split(",");
    expect(cells[0]).toBe("");
    expect(cells[1]).toBe("");
  });
});
