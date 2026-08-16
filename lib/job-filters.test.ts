import { describe, expect, it } from "vitest";
import type { Job } from "@prisma/client";
import { matchesJobQuery, matchesSelectedTags } from "@/lib/job-filters";
import type { JobWithRelations } from "@/lib/types";

function job(overrides: Partial<Job>): Job {
  return {
    id: "job-1",
    userId: "user-1",
    url: "https://example.com/careers/dev",
    title: null,
    companyName: null,
    companyLogoUrl: null,
    notes: null,
    status: "TO_APPLY",
    enrichmentStatus: "DONE",
    order: 0,
    lastFollowUp: null,
    salaryAmount: null,
    salaryType: null,
    resumeUrl: null,
    coverLetterUrl: null,
    interviewDate: null,
    descriptionText: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

function jobWithTags(tagIds: string[]): JobWithRelations {
  return {
    ...job({}),
    contacts: [],
    statusHistory: [],
    tags: tagIds.map((tagId) => ({
      jobId: "job-1",
      tagId,
      tag: { id: tagId, userId: "user-1", name: tagId },
    })),
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

describe("matchesSelectedTags", () => {
  it("matches anything when no tag is selected", () => {
    expect(matchesSelectedTags(jobWithTags([]), [])).toBe(true);
  });

  it("matches a job carrying at least one of the selected tags", () => {
    expect(matchesSelectedTags(jobWithTags(["remote", "senior"]), ["senior"])).toBe(
      true
    );
  });

  it("does not match a job carrying none of the selected tags", () => {
    expect(matchesSelectedTags(jobWithTags(["remote"]), ["senior"])).toBe(false);
  });
});
