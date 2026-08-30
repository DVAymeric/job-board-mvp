import { describe, expect, it } from "vitest";
import { buildHeatmapDays } from "@/lib/heatmap";

describe("buildHeatmapDays", () => {
  it("covers the last 30 days by default (JOB-126, aligné sur le mockup)", () => {
    const today = new Date(2026, 7, 12); // 2026-08-12
    const days = buildHeatmapDays([], today);
    expect(days.length).toBe(30);
    expect(days[0].date).toBe("2026-07-14");
    expect(days[days.length - 1].date).toBe("2026-08-12");
  });

  it("accepts an explicit window size in days", () => {
    const today = new Date(2026, 7, 12);
    const days = buildHeatmapDays([], today, 5, 7);
    expect(days.length).toBe(7);
    expect(days[0].date).toBe("2026-08-06");
  });

  it("ends on the reference date", () => {
    const today = new Date(2026, 7, 12);
    const days = buildHeatmapDays([], today);
    expect(days[days.length - 1].date).toBe("2026-08-12");
  });

  it("counts one job per its creation day", () => {
    const today = new Date(2026, 7, 12);
    const jobs = [
      { createdAt: new Date(2026, 7, 10) },
      { createdAt: new Date(2026, 7, 10) },
      { createdAt: new Date(2026, 7, 11) },
    ];
    const days = buildHeatmapDays(jobs, today);
    expect(days.find((d) => d.date === "2026-08-10")?.count).toBe(2);
    expect(days.find((d) => d.date === "2026-08-11")?.count).toBe(1);
    expect(days.find((d) => d.date === "2026-08-12")?.count).toBe(0);
  });

  it("ignores jobs created before the visible window", () => {
    const today = new Date(2026, 7, 12);
    const jobs = [{ createdAt: new Date(2020, 0, 1) }];
    const days = buildHeatmapDays(jobs, today);
    expect(days.reduce((sum, d) => sum + d.count, 0)).toBe(0);
  });

  it("assigns level 0 to empty days and the top level (5) to a day with 5 or more applications", () => {
    const today = new Date(2026, 7, 12);
    const jobs = [
      { createdAt: new Date(2026, 7, 12) },
      { createdAt: new Date(2026, 7, 12) },
      { createdAt: new Date(2026, 7, 12) },
      { createdAt: new Date(2026, 7, 12) },
      { createdAt: new Date(2026, 7, 12) },
    ];
    const days = buildHeatmapDays(jobs, today);
    expect(days.find((d) => d.date === "2026-08-11")?.level).toBe(0);
    expect(days.find((d) => d.date === "2026-08-12")?.level).toBe(5);
  });

  it("uses a fixed absolute scale (0 to 5+), not relative to the busiest day: a single application anywhere in the window is always level 1, never the top level", () => {
    const today = new Date(2026, 7, 12);
    const jobs = [{ createdAt: new Date(2026, 7, 12) }];
    const days = buildHeatmapDays(jobs, today);
    expect(days.find((d) => d.date === "2026-08-12")?.level).toBe(1);
  });

  it("caps the level at 5 even when a day has more than 5 applications", () => {
    const today = new Date(2026, 7, 12);
    const jobs = Array.from({ length: 9 }, () => ({ createdAt: new Date(2026, 7, 12) }));
    const days = buildHeatmapDays(jobs, today);
    expect(days.find((d) => d.date === "2026-08-12")?.level).toBe(5);
  });

  it("gives count 3 exactly level 3 regardless of what the busiest day in the window is", () => {
    const today = new Date(2026, 7, 12);
    const jobs = [
      { createdAt: new Date(2026, 7, 12) },
      { createdAt: new Date(2026, 7, 12) },
      { createdAt: new Date(2026, 7, 12) },
      // a much busier day elsewhere in the window must not compress the scale
      { createdAt: new Date(2026, 7, 1) },
      { createdAt: new Date(2026, 7, 1) },
      { createdAt: new Date(2026, 7, 1) },
      { createdAt: new Date(2026, 7, 1) },
      { createdAt: new Date(2026, 7, 1) },
      { createdAt: new Date(2026, 7, 1) },
      { createdAt: new Date(2026, 7, 1) },
      { createdAt: new Date(2026, 7, 1) },
    ];
    const days = buildHeatmapDays(jobs, today);
    expect(days.find((d) => d.date === "2026-08-12")?.level).toBe(3);
  });

  describe("with levels: 3", () => {
    it("re-bins the ratio into 3 levels instead of 6", () => {
      const today = new Date(2026, 7, 12);
      const jobs = [
        // busiest day: 4 jobs on the 12th (ratio 1 -> top level)
        { createdAt: new Date(2026, 7, 12) },
        { createdAt: new Date(2026, 7, 12) },
        { createdAt: new Date(2026, 7, 12) },
        { createdAt: new Date(2026, 7, 12) },
        // ratio 0.25 -> level 1
        { createdAt: new Date(2026, 7, 9) },
        // ratio 0.5 -> level 2
        { createdAt: new Date(2026, 7, 10) },
        { createdAt: new Date(2026, 7, 10) },
        // ratio 0.75 -> level 3 (top)
        { createdAt: new Date(2026, 7, 11) },
        { createdAt: new Date(2026, 7, 11) },
        { createdAt: new Date(2026, 7, 11) },
      ];
      const days = buildHeatmapDays(jobs, today, 3);
      expect(days.find((d) => d.date === "2026-08-09")?.level).toBe(1);
      expect(days.find((d) => d.date === "2026-08-10")?.level).toBe(2);
      expect(days.find((d) => d.date === "2026-08-11")?.level).toBe(3);
      expect(days.find((d) => d.date === "2026-08-12")?.level).toBe(3);
    });

    it("still assigns level 0 to empty days", () => {
      const today = new Date(2026, 7, 12);
      const jobs = [{ createdAt: new Date(2026, 7, 12) }];
      const days = buildHeatmapDays(jobs, today, 3);
      expect(days.find((d) => d.date === "2026-08-11")?.level).toBe(0);
    });
  });
});
