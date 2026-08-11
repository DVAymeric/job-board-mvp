import { describe, expect, it } from "vitest";
import type { Job } from "@prisma/client";
import { matchesJobQuery } from "@/lib/job-filters";

function job(overrides: Partial<Job>): Job {
  return {
    id: "job-1",
    url: "https://example.com/careers/dev",
    title: null,
    companyName: null,
    companyLogoUrl: null,
    notes: null,
    status: "TO_APPLY",
    archived: false,
    order: 0,
    lastFollowUp: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

describe("matchesJobQuery", () => {
  it("matches an empty query against anything", () => {
    expect(matchesJobQuery(job({}), "")).toBe(true);
    expect(matchesJobQuery(job({}), "   ")).toBe(true);
  });

  it("matches on title, case-insensitively", () => {
    expect(matchesJobQuery(job({ title: "Développeur Backend" }), "backend")).toBe(true);
    expect(matchesJobQuery(job({ title: "Développeur Backend" }), "frontend")).toBe(false);
  });

  it("matches on companyName", () => {
    expect(matchesJobQuery(job({ companyName: "Acme Corp" }), "acme")).toBe(true);
  });

  it("matches on url", () => {
    expect(matchesJobQuery(job({ url: "https://acme.example.com/jobs/42" }), "acme.example")).toBe(
      true
    );
  });

  it("does not match when the query appears in none of the fields", () => {
    expect(
      matchesJobQuery(
        job({ title: "Développeur", companyName: "Acme", url: "https://acme.example.com" }),
        "beta"
      )
    ).toBe(false);
  });
});
