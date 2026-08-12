import { describe, expect, it } from "vitest";
import { buildHeatmapDays } from "@/lib/heatmap";

describe("buildHeatmapDays", () => {
  it("covers roughly the last 12 rolling months, starting on a Sunday", () => {
    const today = new Date(2026, 7, 12); // 2026-08-12
    const days = buildHeatmapDays([], today);
    // 53 full weeks back, aligned to the nearest preceding Sunday: between
    // 371 (53*7) and 377 (53*7 + 6) days depending on today's weekday.
    expect(days.length).toBeGreaterThanOrEqual(53 * 7);
    expect(days.length).toBeLessThanOrEqual(53 * 7 + 6);
    expect(new Date(days[0].date + "T00:00:00").getDay()).toBe(0);
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

  it("assigns level 0 to empty days and the top level to the busiest day", () => {
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

  it("gives any single application at least level 1 when there is no busier day", () => {
    const today = new Date(2026, 7, 12);
    const jobs = [{ createdAt: new Date(2026, 7, 12) }];
    const days = buildHeatmapDays(jobs, today);
    expect(days.find((d) => d.date === "2026-08-12")?.level).toBe(5);
  });
});
