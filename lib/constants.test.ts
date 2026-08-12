import { describe, expect, it } from "vitest";
import { needsFollowUp, STATUS } from "@/lib/constants";

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

describe("needsFollowUp", () => {
  it("returns false when the job is not in APPLIED status", () => {
    expect(
      needsFollowUp({
        status: STATUS.TO_APPLY,
        lastFollowUp: null,
        createdAt: daysAgo(30),
      })
    ).toBe(false);
  });

  it("returns false when APPLIED with a recent lastFollowUp", () => {
    expect(
      needsFollowUp({
        status: STATUS.APPLIED,
        lastFollowUp: daysAgo(2),
        createdAt: daysAgo(10),
      })
    ).toBe(false);
  });

  it("returns true when APPLIED with lastFollowUp at least FOLLOW_UP_DAYS ago", () => {
    expect(
      needsFollowUp({
        status: STATUS.APPLIED,
        lastFollowUp: daysAgo(7),
        createdAt: daysAgo(20),
      })
    ).toBe(true);
  });

  it("falls back to createdAt when lastFollowUp is null", () => {
    expect(
      needsFollowUp({
        status: STATUS.APPLIED,
        lastFollowUp: null,
        createdAt: daysAgo(9),
      })
    ).toBe(true);
  });

  it("returns false when falling back to a recent createdAt", () => {
    expect(
      needsFollowUp({
        status: STATUS.APPLIED,
        lastFollowUp: null,
        createdAt: daysAgo(1),
      })
    ).toBe(false);
  });
});
