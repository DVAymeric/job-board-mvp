import { describe, expect, it } from "vitest";
import { computeArchiveStats } from "@/lib/archive-stats";

describe("computeArchiveStats", () => {
  it("returns null rate/tenure when there are no archived jobs", () => {
    const stats = computeArchiveStats(0, 0, []);
    expect(stats).toEqual({
      totalArchived: 0,
      refusedRatePercent: null,
      averageTenureDays: null,
    });
  });

  it("computes the refused rate as a rounded percentage", () => {
    const stats = computeArchiveStats(3, 1, []);
    expect(stats.refusedRatePercent).toBe(33);
  });

  it("rounds the refused rate to the nearest percent", () => {
    const stats = computeArchiveStats(8, 5, []);
    // 5/8 = 62.5% -> rounds to 63
    expect(stats.refusedRatePercent).toBe(63);
  });

  it("computes the average tenure in whole days from createdAt to updatedAt", () => {
    const stats = computeArchiveStats(2, 0, [
      { createdAt: new Date("2026-01-01T00:00:00Z"), updatedAt: new Date("2026-01-11T00:00:00Z") },
      { createdAt: new Date("2026-01-01T00:00:00Z"), updatedAt: new Date("2026-01-21T00:00:00Z") },
    ]);
    // (10 days + 20 days) / 2 = 15 days
    expect(stats.averageTenureDays).toBe(15);
  });

  it("passes the total archived count through unchanged", () => {
    const stats = computeArchiveStats(42, 10, []);
    expect(stats.totalArchived).toBe(42);
  });
});
