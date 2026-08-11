import { describe, expect, it } from "vitest";
import {
  archiveJobSchema,
  checkJobUrlSchema,
  createJobSchema,
  deleteJobSchema,
  markFollowUpTodaySchema,
  updateJobDetailsSchema,
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
      titleCompany: "Dev - Acme",
      status: "TO_APPLY",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.url).toBe("https://example.com/job");
      expect(result.data.titleCompany).toBe("Dev - Acme");
    }
  });

  it("accepts an omitted titleCompany", () => {
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
  it("accepts an empty titleCompany (clears the field)", () => {
    const result = updateJobDetailsSchema.safeParse({ id: "job-1", titleCompany: "" });
    expect(result.success).toBe(true);
  });

  it("rejects a missing id", () => {
    const result = updateJobDetailsSchema.safeParse({ titleCompany: "x" });
    expect(result.success).toBe(false);
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

describe("deleteJobSchema", () => {
  it("accepts a non-empty id", () => {
    expect(deleteJobSchema.safeParse({ id: "job-1" }).success).toBe(true);
  });

  it("rejects a missing id", () => {
    expect(deleteJobSchema.safeParse({}).success).toBe(false);
  });
});
