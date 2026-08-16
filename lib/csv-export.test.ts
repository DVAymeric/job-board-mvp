import { describe, expect, it } from "vitest";
import { buildJobsCsv } from "@/lib/csv-export";

type ExportJob = Parameters<typeof buildJobsCsv>[0][number];

function job(overrides: Partial<ExportJob>): ExportJob {
  return {
    title: "Développeur",
    companyName: "Acme",
    status: "TO_APPLY",
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

  it("uses a semicolon separator (Excel FR) and clear French headers, ordered for a human reader", () => {
    const csv = buildJobsCsv([job({})]);
    const firstLine = csv.slice(1).split("\r\n")[0];
    expect(firstLine).toBe(
      "Poste;Entreprise;Statut;Date de candidature;Dernière relance;Tags"
    );
  });

  it("does not include the raw scraping URL or other internal/technical fields", () => {
    const csv = buildJobsCsv([job({})]);
    const firstLine = csv.slice(1).split("\r\n")[0];
    expect(firstLine).not.toMatch(/url/i);
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

  it("formats dates as DD/MM/YYYY rather than raw ISO timestamps", () => {
    const csv = buildJobsCsv([
      job({
        createdAt: new Date("2026-03-05T10:00:00Z"),
        lastFollowUp: new Date("2026-03-12T10:00:00Z"),
      }),
    ]);
    const rows = csv.slice(1).split("\r\n");
    expect(rows[1]).toContain("05/03/2026");
    expect(rows[1]).toContain("12/03/2026");
    expect(rows[1]).not.toContain("2026-03-05");
  });

  it("quotes and escapes fields containing the separator, commas or quotes", () => {
    const csv = buildJobsCsv([job({ title: 'Dev, "Backend"; Senior' })]);
    const rows = csv.slice(1).split("\r\n");
    expect(rows[1]).toContain('"Dev, ""Backend""; Senior"');
  });

  it("leaves an empty cell for a null title/companyName/lastFollowUp", () => {
    const csv = buildJobsCsv([
      job({ title: null, companyName: null, lastFollowUp: null }),
    ]);
    const rows = csv.slice(1).split("\r\n");
    const cells = rows[1].split(";");
    expect(cells[0]).toBe("");
    expect(cells[1]).toBe("");
    expect(cells[4]).toBe("");
  });
});
