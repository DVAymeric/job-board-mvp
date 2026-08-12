import { describe, expect, it } from "vitest";
import {
  computeStatusCounts,
  computeFollowUpSummary,
} from "@/lib/home-stats";
import { STATUS } from "@/lib/constants";

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

describe("computeStatusCounts", () => {
  it("counts jobs per status, defaulting missing statuses to zero", () => {
    const jobs = [
      { status: STATUS.TO_APPLY },
      { status: STATUS.APPLIED },
      { status: STATUS.APPLIED },
    ];
    expect(computeStatusCounts(jobs)).toEqual({
      TO_APPLY: 1,
      APPLIED: 2,
      INTERVIEW: 0,
      REJECTED: 0,
    });
  });

  it("returns all-zero counts for an empty list", () => {
    expect(computeStatusCounts([])).toEqual({
      TO_APPLY: 0,
      APPLIED: 0,
      INTERVIEW: 0,
      REJECTED: 0,
    });
  });
});

describe("computeFollowUpSummary", () => {
  it("returns a zero count and null oldestDays when nothing needs follow-up", () => {
    const jobs = [
      { status: STATUS.TO_APPLY, lastFollowUp: null, createdAt: daysAgo(30) },
      { status: STATUS.APPLIED, lastFollowUp: daysAgo(1), createdAt: daysAgo(10) },
    ];
    expect(computeFollowUpSummary(jobs)).toEqual({ count: 0, oldestDays: null });
  });

  it("counts APPLIED jobs overdue for follow-up and reports the oldest in days", () => {
    const jobs = [
      { status: STATUS.APPLIED, lastFollowUp: daysAgo(9), createdAt: daysAgo(20) },
      { status: STATUS.APPLIED, lastFollowUp: daysAgo(7), createdAt: daysAgo(15) },
      { status: STATUS.APPLIED, lastFollowUp: daysAgo(1), createdAt: daysAgo(15) },
      { status: STATUS.REJECTED, lastFollowUp: daysAgo(90), createdAt: daysAgo(90) },
    ];
    expect(computeFollowUpSummary(jobs)).toEqual({ count: 2, oldestDays: 9 });
  });
});
