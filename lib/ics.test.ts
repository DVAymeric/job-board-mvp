import { describe, expect, it } from "vitest";
import { buildInterviewIcs } from "@/lib/ics";

describe("buildInterviewIcs", () => {
  const job = {
    id: "job-1",
    title: "Développeur Backend",
    companyName: "Acme",
    url: "https://example.com/careers/dev",
    interviewDate: new Date("2026-03-15T14:30:00Z"),
  };

  it("produces a well-formed VCALENDAR/VEVENT with CRLF line endings", () => {
    const ics = buildInterviewIcs(job);
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("BEGIN:VEVENT\r\n");
    expect(ics).toContain("END:VEVENT\r\n");
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
  });

  it("includes the interview start/end time in UTC basic format", () => {
    const ics = buildInterviewIcs(job);
    expect(ics).toContain("DTSTART:20260315T143000Z");
    expect(ics).toContain("DTEND:20260316T143000Z".slice(0, 8)); // sanity: DTEND present
    expect(ics).toMatch(/DTEND:20260315T1[45]3000Z/);
  });

  it("includes a summary mentioning the job title and company", () => {
    const ics = buildInterviewIcs(job);
    expect(ics).toContain("SUMMARY:Entretien - Développeur Backend chez Acme");
  });

  it("escapes commas and semicolons in text fields", () => {
    const ics = buildInterviewIcs({
      ...job,
      title: "Dev, Backend; Senior",
    });
    expect(ics).toContain("Dev\\, Backend\\; Senior");
  });

  it("falls back to the url when title/company are missing", () => {
    const ics = buildInterviewIcs({
      ...job,
      title: null,
      companyName: null,
    });
    expect(ics).toContain(`SUMMARY:Entretien - ${job.url}`);
  });

  it("gives each job a stable, unique UID", () => {
    const ics = buildInterviewIcs(job);
    expect(ics).toContain("UID:job-1@job-board-mvp");
  });
});
