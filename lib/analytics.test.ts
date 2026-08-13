import { describe, expect, it } from "vitest";
import { computeStatusFunnel, computeMostActiveMonth } from "@/lib/analytics";

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

describe("computeMostActiveMonth", () => {
  const today = new Date(2026, 7, 15); // 2026-08-15

  it("returns the month with the most job creations and its count", () => {
    const jobs = [
      { createdAt: new Date(2026, 6, 1) },
      { createdAt: new Date(2026, 6, 10) },
      { createdAt: new Date(2026, 6, 20) },
      { createdAt: new Date(2026, 5, 5) },
    ];
    const result = computeMostActiveMonth(jobs, today);
    expect(result).toEqual({ label: "Juillet", count: 3 });
  });

  it("breaks ties by picking the most recent month", () => {
    const jobs = [
      { createdAt: new Date(2026, 5, 1) },
      { createdAt: new Date(2026, 5, 2) },
      { createdAt: new Date(2026, 7, 1) },
      { createdAt: new Date(2026, 7, 2) },
    ];
    const result = computeMostActiveMonth(jobs, today);
    expect(result).toEqual({ label: "Août", count: 2 });
  });

  it("returns null when there are no jobs in the rolling 12-month window", () => {
    expect(computeMostActiveMonth([], today)).toBeNull();
  });

  it("ignores jobs created before the rolling 12-month window", () => {
    const jobs = [
      { createdAt: new Date(2025, 7, 31) }, // one day before the window starts
      { createdAt: new Date(2024, 0, 1) },
    ];
    expect(computeMostActiveMonth(jobs, today)).toBeNull();
  });
});
