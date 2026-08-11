import { describe, expect, it } from "vitest";
import { computeStatusFunnel } from "@/lib/analytics";

function jobWithHistory(statuses: string[]) {
  return { statusHistory: statuses.map((status) => ({ status })) };
}

describe("computeStatusFunnel", () => {
  it("counts each job once per stage it ever reached", () => {
    const jobs = [
      jobWithHistory(["TO_APPLY", "APPLIED", "INTERVIEW"]),
      jobWithHistory(["TO_APPLY", "APPLIED"]),
      jobWithHistory(["TO_APPLY"]),
    ];
    const funnel = computeStatusFunnel(jobs);

    expect(funnel.map((s) => [s.status, s.count])).toEqual([
      ["TO_APPLY", 3],
      ["APPLIED", 2],
      ["INTERVIEW", 1],
      ["REJECTED", 0],
    ]);
  });

  it("computes the conversion rate from the previous stage, null for the first", () => {
    const jobs = [
      jobWithHistory(["TO_APPLY", "APPLIED"]),
      jobWithHistory(["TO_APPLY", "APPLIED"]),
      jobWithHistory(["TO_APPLY"]),
      jobWithHistory(["TO_APPLY"]),
    ];
    const funnel = computeStatusFunnel(jobs);

    expect(funnel[0].conversionFromPrevious).toBeNull();
    expect(funnel[1].conversionFromPrevious).toBe(50);
  });

  it("does not double count repeated visits to the same stage", () => {
    const jobs = [jobWithHistory(["TO_APPLY", "APPLIED", "TO_APPLY", "APPLIED"])];
    const funnel = computeStatusFunnel(jobs);
    expect(funnel.find((s) => s.status === "APPLIED")?.count).toBe(1);
  });

  it("returns all-zero counts with null conversions for no jobs", () => {
    const funnel = computeStatusFunnel([]);
    expect(funnel.every((s) => s.count === 0)).toBe(true);
    expect(funnel[1].conversionFromPrevious).toBeNull();
  });

  it("reports 0% (not null) when the current stage has no candidates but the previous one did", () => {
    const jobs = [jobWithHistory(["TO_APPLY"])];
    const funnel = computeStatusFunnel(jobs);
    expect(funnel.find((s) => s.status === "APPLIED")?.conversionFromPrevious).toBe(0);
  });

  it("guards against division by zero when the previous stage itself has no candidates", () => {
    const funnel = computeStatusFunnel([]);
    expect(funnel.find((s) => s.status === "APPLIED")?.conversionFromPrevious).toBeNull();
  });
});
