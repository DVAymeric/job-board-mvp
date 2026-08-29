import { describe, expect, it } from "vitest";
import { getCurrentStatusDate } from "@/lib/job-status-date";
import { STATUS } from "@/lib/constants";

describe("getCurrentStatusDate (JOB-124)", () => {
  it("returns the date of the most recent history entry matching the current status", () => {
    const job = {
      status: STATUS.INTERVIEW,
      statusHistory: [
        { status: STATUS.TO_APPLY, changedAt: new Date("2026-08-01") },
        { status: STATUS.APPLIED, changedAt: new Date("2026-08-05") },
        { status: STATUS.INTERVIEW, changedAt: new Date("2026-08-12") },
      ],
    };
    expect(getCurrentStatusDate(job)).toEqual(new Date("2026-08-12"));
  });

  it("picks the latest entry when the job re-entered the same status twice", () => {
    const job = {
      status: STATUS.APPLIED,
      statusHistory: [
        { status: STATUS.APPLIED, changedAt: new Date("2026-08-01") },
        { status: STATUS.INTERVIEW, changedAt: new Date("2026-08-05") },
        { status: STATUS.APPLIED, changedAt: new Date("2026-08-10") },
      ],
    };
    expect(getCurrentStatusDate(job)).toEqual(new Date("2026-08-10"));
  });

  it("returns null when the history has no entry for the current status (legacy data)", () => {
    const job = { status: STATUS.INTERVIEW, statusHistory: [] };
    expect(getCurrentStatusDate(job)).toBeNull();
  });
});
