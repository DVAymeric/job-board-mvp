import { describe, expect, it } from "vitest";
import type { Job } from "@prisma/client";
import { computeReorderedColumn } from "@/lib/board-reorder";

function job(id: string, status: string, order: number): Job {
  return {
    id,
    url: `https://example.com/${id}`,
    title: id,
    companyName: null,
    companyLogoUrl: null,
    notes: null,
    status,
    archived: false,
    order,
    lastFollowUp: null,
    salaryAmount: null,
    salaryType: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  };
}

describe("computeReorderedColumn", () => {
  it("reorders siblings within the same column, inserting before the drop target", () => {
    const jobs = [
      job("a", "TO_APPLY", 0),
      job("b", "TO_APPLY", 1),
      job("c", "TO_APPLY", 2),
    ];
    const result = computeReorderedColumn(jobs, "a", "c");
    expect(result).toEqual({
      targetStatus: "TO_APPLY",
      orderedIds: ["b", "a", "c"],
    });
  });

  it("moves a card into an empty column when dropped on the column itself", () => {
    const jobs = [job("a", "TO_APPLY", 0)];
    const result = computeReorderedColumn(jobs, "a", "APPLIED");
    expect(result).toEqual({ targetStatus: "APPLIED", orderedIds: ["a"] });
  });

  it("moves a card into another column, inserted before the card it was dropped on", () => {
    const jobs = [
      job("a", "TO_APPLY", 0),
      job("b", "APPLIED", 0),
      job("c", "APPLIED", 1),
    ];
    const result = computeReorderedColumn(jobs, "a", "b");
    expect(result).toEqual({
      targetStatus: "APPLIED",
      orderedIds: ["a", "b", "c"],
    });
  });

  it("appends to the end of another column when dropped past all cards (column id)", () => {
    const jobs = [
      job("a", "TO_APPLY", 0),
      job("b", "APPLIED", 0),
      job("c", "APPLIED", 1),
    ];
    const result = computeReorderedColumn(jobs, "a", "APPLIED");
    expect(result).toEqual({
      targetStatus: "APPLIED",
      orderedIds: ["b", "c", "a"],
    });
  });

  it("returns null when the active job does not exist", () => {
    const jobs = [job("a", "TO_APPLY", 0)];
    expect(computeReorderedColumn(jobs, "missing", "a")).toBeNull();
  });

  it("returns null when the drop target matches neither a job nor a known status", () => {
    const jobs = [job("a", "TO_APPLY", 0)];
    expect(computeReorderedColumn(jobs, "a", "not-a-status-or-id")).toBeNull();
  });
});
