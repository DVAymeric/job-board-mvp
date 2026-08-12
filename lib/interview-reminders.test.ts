import { describe, expect, it } from "vitest";
import { getUpcomingInterviews } from "@/lib/interview-reminders";

function job(id: string, interviewDate: Date | null) {
  return { id, title: `Job ${id}`, companyName: "Acme", interviewDate };
}

describe("getUpcomingInterviews", () => {
  const now = new Date("2026-03-15T10:00:00Z");

  it("includes an interview happening within the next 24h", () => {
    const jobs = [job("a", new Date("2026-03-15T20:00:00Z"))];
    expect(getUpcomingInterviews(jobs, now).map((j) => j.id)).toEqual(["a"]);
  });

  it("excludes an interview more than 24h away", () => {
    const jobs = [job("a", new Date("2026-03-20T20:00:00Z"))];
    expect(getUpcomingInterviews(jobs, now)).toEqual([]);
  });

  it("excludes an interview that already happened", () => {
    const jobs = [job("a", new Date("2026-03-14T20:00:00Z"))];
    expect(getUpcomingInterviews(jobs, now)).toEqual([]);
  });

  it("excludes jobs without an interview date", () => {
    const jobs = [job("a", null)];
    expect(getUpcomingInterviews(jobs, now)).toEqual([]);
  });

  it("respects a custom threshold in hours", () => {
    const jobs = [job("a", new Date("2026-03-15T15:00:00Z"))];
    expect(getUpcomingInterviews(jobs, now, 2)).toEqual([]);
    expect(getUpcomingInterviews(jobs, now, 6)).toHaveLength(1);
  });
});
