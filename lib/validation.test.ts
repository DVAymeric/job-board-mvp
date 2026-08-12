import { describe, expect, it } from "vitest";
import {
  addContactSchema,
  addTagToJobSchema,
  archiveJobSchema,
  checkJobUrlSchema,
  createJobSchema,
  deleteContactSchema,
  deleteJobSchema,
  markFollowUpTodaySchema,
  removeTagFromJobSchema,
  reorderJobsSchema,
  unarchiveJobSchema,
  updateContactSchema,
  updateJobDetailsSchema,
  updateJobDocumentsSchema,
  updateJobInterviewDateSchema,
  updateJobNotesSchema,
  updateJobSalarySchema,
  updateJobStatusSchema,
} from "@/lib/validation";

describe("checkJobUrlSchema", () => {
  it("normalizes a valid url", () => {
    const result = checkJobUrlSchema.safeParse("example.com/job");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("https://example.com/job");
  });

  it("rejects an empty url", () => {
    const result = checkJobUrlSchema.safeParse("   ");
    expect(result.success).toBe(false);
  });

  it("rejects a malformed url", () => {
    const result = checkJobUrlSchema.safeParse("not a url");
    expect(result.success).toBe(false);
  });
});

describe("createJobSchema", () => {
  it("accepts a valid TO_APPLY payload", () => {
    const result = createJobSchema.safeParse({
      url: "example.com/job",
      title: "Développeur",
      companyName: "Acme",
      status: "TO_APPLY",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.url).toBe("https://example.com/job");
      expect(result.data.title).toBe("Développeur");
      expect(result.data.companyName).toBe("Acme");
    }
  });

  it("accepts omitted title/companyName", () => {
    const result = createJobSchema.safeParse({
      url: "example.com/job",
      status: "APPLIED",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a status outside TO_APPLY/APPLIED", () => {
    const result = createJobSchema.safeParse({
      url: "example.com/job",
      status: "INTERVIEW",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid url", () => {
    const result = createJobSchema.safeParse({
      url: "not a url",
      status: "TO_APPLY",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid companyLogoUrl", () => {
    const result = createJobSchema.safeParse({
      url: "example.com/job",
      status: "TO_APPLY",
      companyLogoUrl: "https://logo.clearbit.com/acme.com",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a malformed companyLogoUrl", () => {
    const result = createJobSchema.safeParse({
      url: "example.com/job",
      status: "TO_APPLY",
      companyLogoUrl: "not a url",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateJobStatusSchema", () => {
  it("accepts any known job status", () => {
    const result = updateJobStatusSchema.safeParse({
      id: "job-1",
      status: "INTERVIEW",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown status", () => {
    const result = updateJobStatusSchema.safeParse({
      id: "job-1",
      status: "GHOSTED",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty id", () => {
    const result = updateJobStatusSchema.safeParse({ id: "", status: "APPLIED" });
    expect(result.success).toBe(false);
  });
});

describe("updateJobDetailsSchema", () => {
  it("accepts empty title/companyName (clears the fields)", () => {
    const result = updateJobDetailsSchema.safeParse({
      id: "job-1",
      title: "",
      companyName: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing id", () => {
    const result = updateJobDetailsSchema.safeParse({ title: "x", companyName: "y" });
    expect(result.success).toBe(false);
  });
});

describe("updateJobNotesSchema", () => {
  it("accepts empty notes (clears the field)", () => {
    expect(
      updateJobNotesSchema.safeParse({ id: "job-1", notes: "" }).success
    ).toBe(true);
  });

  it("accepts free-form multiline notes", () => {
    const result = updateJobNotesSchema.safeParse({
      id: "job-1",
      notes: "Ligne 1\nLigne 2",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing id", () => {
    expect(updateJobNotesSchema.safeParse({ notes: "x" }).success).toBe(false);
  });
});

describe("markFollowUpTodaySchema", () => {
  it("accepts a non-empty id", () => {
    expect(markFollowUpTodaySchema.safeParse({ id: "job-1" }).success).toBe(true);
  });

  it("rejects an empty id", () => {
    expect(markFollowUpTodaySchema.safeParse({ id: "" }).success).toBe(false);
  });
});

describe("archiveJobSchema", () => {
  it("accepts a non-empty id", () => {
    expect(archiveJobSchema.safeParse({ id: "job-1" }).success).toBe(true);
  });

  it("rejects a missing id", () => {
    expect(archiveJobSchema.safeParse({}).success).toBe(false);
  });
});

describe("unarchiveJobSchema", () => {
  it("accepts a non-empty id", () => {
    expect(unarchiveJobSchema.safeParse({ id: "job-1" }).success).toBe(true);
  });

  it("rejects a missing id", () => {
    expect(unarchiveJobSchema.safeParse({}).success).toBe(false);
  });
});

describe("deleteJobSchema", () => {
  it("accepts a non-empty id", () => {
    expect(deleteJobSchema.safeParse({ id: "job-1" }).success).toBe(true);
  });

  it("rejects a missing id", () => {
    expect(deleteJobSchema.safeParse({}).success).toBe(false);
  });
});

describe("reorderJobsSchema", () => {
  it("accepts a non-empty list of ids", () => {
    const result = reorderJobsSchema.safeParse({ orderedIds: ["a", "b", "c"] });
    expect(result.success).toBe(true);
  });

  it("rejects an empty list", () => {
    expect(reorderJobsSchema.safeParse({ orderedIds: [] }).success).toBe(false);
  });

  it("rejects a list containing an empty id", () => {
    expect(reorderJobsSchema.safeParse({ orderedIds: ["a", ""] }).success).toBe(
      false
    );
  });
});

describe("addTagToJobSchema", () => {
  it("accepts a trimmed tag name", () => {
    const result = addTagToJobSchema.safeParse({ jobId: "job-1", tagName: "  Remote  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.tagName).toBe("Remote");
  });

  it("rejects an empty tag name", () => {
    expect(
      addTagToJobSchema.safeParse({ jobId: "job-1", tagName: "   " }).success
    ).toBe(false);
  });

  it("rejects a tag name longer than 40 characters", () => {
    expect(
      addTagToJobSchema.safeParse({ jobId: "job-1", tagName: "a".repeat(41) })
        .success
    ).toBe(false);
  });
});

describe("removeTagFromJobSchema", () => {
  it("accepts non-empty jobId and tagId", () => {
    expect(
      removeTagFromJobSchema.safeParse({ jobId: "job-1", tagId: "tag-1" }).success
    ).toBe(true);
  });

  it("rejects a missing tagId", () => {
    expect(removeTagFromJobSchema.safeParse({ jobId: "job-1" }).success).toBe(
      false
    );
  });
});

describe("addContactSchema", () => {
  it("accepts a valid contact with linkedinUrl", () => {
    const result = addContactSchema.safeParse({
      jobId: "job-1",
      name: "Jane Doe",
      role: "RECRUITER",
      linkedinUrl: "https://linkedin.com/in/janedoe",
    });
    expect(result.success).toBe(true);
  });

  it("accepts an omitted linkedinUrl", () => {
    const result = addContactSchema.safeParse({
      jobId: "job-1",
      name: "Jane Doe",
      role: "OTHER",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing name", () => {
    const result = addContactSchema.safeParse({
      jobId: "job-1",
      name: "  ",
      role: "OTHER",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid role", () => {
    const result = addContactSchema.safeParse({
      jobId: "job-1",
      name: "Jane Doe",
      role: "CEO",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed linkedinUrl", () => {
    const result = addContactSchema.safeParse({
      jobId: "job-1",
      name: "Jane Doe",
      role: "OTHER",
      linkedinUrl: "not a url",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateContactSchema", () => {
  it("requires a contactId instead of a jobId", () => {
    const result = updateContactSchema.safeParse({
      contactId: "contact-1",
      name: "Jane Doe",
      role: "MANAGER",
    });
    expect(result.success).toBe(true);
  });
});

describe("deleteContactSchema", () => {
  it("accepts a non-empty contactId", () => {
    expect(
      deleteContactSchema.safeParse({ contactId: "contact-1" }).success
    ).toBe(true);
  });

  it("rejects a missing contactId", () => {
    expect(deleteContactSchema.safeParse({}).success).toBe(false);
  });
});

describe("updateJobSalarySchema", () => {
  it("accepts a valid annual salary", () => {
    const result = updateJobSalarySchema.safeParse({
      id: "job-1",
      salaryAmount: 45000,
      salaryType: "ANNUAL",
    });
    expect(result.success).toBe(true);
  });

  it("accepts null amount and type (clears the field)", () => {
    const result = updateJobSalarySchema.safeParse({
      id: "job-1",
      salaryAmount: null,
      salaryType: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a negative or zero amount", () => {
    expect(
      updateJobSalarySchema.safeParse({ id: "job-1", salaryAmount: 0, salaryType: "ANNUAL" })
        .success
    ).toBe(false);
    expect(
      updateJobSalarySchema.safeParse({ id: "job-1", salaryAmount: -500, salaryType: "ANNUAL" })
        .success
    ).toBe(false);
  });

  it("rejects an invalid salary type", () => {
    const result = updateJobSalarySchema.safeParse({
      id: "job-1",
      salaryAmount: 500,
      salaryType: "MONTHLY",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateJobDocumentsSchema", () => {
  it("accepts valid resume and cover letter URLs", () => {
    const result = updateJobDocumentsSchema.safeParse({
      id: "job-1",
      resumeUrl: "https://drive.example.com/cv.pdf",
      coverLetterUrl: "https://drive.example.com/lettre.pdf",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty strings (clears the fields)", () => {
    const result = updateJobDocumentsSchema.safeParse({
      id: "job-1",
      resumeUrl: "",
      coverLetterUrl: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a malformed URL", () => {
    const result = updateJobDocumentsSchema.safeParse({
      id: "job-1",
      resumeUrl: "not a url",
      coverLetterUrl: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateJobInterviewDateSchema", () => {
  it("accepts a valid ISO date string", () => {
    const result = updateJobInterviewDateSchema.safeParse({
      id: "job-1",
      interviewDate: "2026-03-15T14:30:00.000Z",
    });
    expect(result.success).toBe(true);
  });

  it("accepts null (clears the field)", () => {
    const result = updateJobInterviewDateSchema.safeParse({
      id: "job-1",
      interviewDate: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unparsable date string", () => {
    const result = updateJobInterviewDateSchema.safeParse({
      id: "job-1",
      interviewDate: "not a date",
    });
    expect(result.success).toBe(false);
  });
});
