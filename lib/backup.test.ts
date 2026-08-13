import { describe, expect, it } from "vitest";
import { buildBackupFile, backupFileSchema, BACKUP_SCHEMA_VERSION } from "@/lib/backup";
import type { JobWithRelations } from "@/lib/types";

function job(overrides: Partial<JobWithRelations>): JobWithRelations {
  return {
    id: "job-1",
    userId: "user-1",
    url: "https://example.com/job",
    title: "Développeur",
    companyName: "Acme",
    companyLogoUrl: null,
    notes: null,
    status: "TO_APPLY",
    archived: false,
    order: 0,
    lastFollowUp: null,
    createdAt: new Date("2026-01-01T10:00:00Z"),
    updatedAt: new Date("2026-01-02T10:00:00Z"),
    salaryAmount: null,
    salaryType: null,
    resumeUrl: null,
    coverLetterUrl: null,
    interviewDate: null,
    descriptionText: null,
    tags: [],
    contacts: [],
    statusHistory: [],
    ...overrides,
  };
}

describe("buildBackupFile", () => {
  it("includes the schema version and an ISO export timestamp", () => {
    const backup = buildBackupFile([], []);
    expect(backup.schemaVersion).toBe(BACKUP_SCHEMA_VERSION);
    expect(() => new Date(backup.exportedAt).toISOString()).not.toThrow();
  });

  it("serializes every relation of a job", () => {
    const backup = buildBackupFile(
      [
        job({
          tags: [
            {
              jobId: "job-1",
              tagId: "tag-1",
              tag: { id: "tag-1", userId: "user-1", name: "Remote" },
            },
          ],
          contacts: [
            {
              id: "contact-1",
              userId: "user-1",
              jobId: "job-1",
              name: "Jane Doe",
              role: "RECRUITER",
              linkedinUrl: null,
              createdAt: new Date("2026-01-01T00:00:00Z"),
              updatedAt: new Date("2026-01-01T00:00:00Z"),
            },
          ],
          statusHistory: [
            { id: "sh-1", jobId: "job-1", status: "TO_APPLY", changedAt: new Date("2026-01-01T00:00:00Z") },
          ],
        }),
      ],
      [{ id: "tag-1", name: "Remote" }]
    );

    expect(backup.jobs).toHaveLength(1);
    expect(backup.jobs[0].tagIds).toEqual(["tag-1"]);
    expect(backup.jobs[0].contacts).toEqual([
      {
        id: "contact-1",
        name: "Jane Doe",
        role: "RECRUITER",
        linkedinUrl: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
    expect(backup.jobs[0].statusHistory).toEqual([
      { id: "sh-1", status: "TO_APPLY", changedAt: "2026-01-01T00:00:00.000Z" },
    ]);
    expect(backup.tags).toEqual([{ id: "tag-1", name: "Remote" }]);
  });

  it("produces output that validates against backupFileSchema", () => {
    const backup = buildBackupFile([job({})], []);
    const result = backupFileSchema.safeParse(backup);
    expect(result.success).toBe(true);
  });
});

describe("backupFileSchema", () => {
  it("rejects a payload missing required fields", () => {
    const result = backupFileSchema.safeParse({ schemaVersion: 1 });
    expect(result.success).toBe(false);
  });

  it("rejects a job entry with the wrong type for archived", () => {
    const result = backupFileSchema.safeParse({
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      tags: [],
      jobs: [
        {
          id: "job-1",
          url: "https://example.com",
          title: null,
          companyName: null,
          companyLogoUrl: null,
          notes: null,
          status: "TO_APPLY",
          archived: "yes",
          order: 0,
          lastFollowUp: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tagIds: [],
          contacts: [],
          statusHistory: [],
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("accepts a minimal well-formed backup", () => {
    const result = backupFileSchema.safeParse({
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      tags: [],
      jobs: [],
    });
    expect(result.success).toBe(true);
  });
});
