import { describe, expect, it } from "vitest";
import { adjacentStatus, computeNextFocusedJob } from "@/lib/board-keyboard";

describe("computeNextFocusedJob", () => {
  const columns = [
    { status: "TO_APPLY", jobIds: ["a", "b"] },
    { status: "APPLIED", jobIds: [] },
    { status: "INTERVIEW", jobIds: ["c"] },
    { status: "REJECTED", jobIds: ["d", "e", "f"] },
  ];

  it("returns null when every column is empty", () => {
    const emptyColumns = [
      { status: "TO_APPLY", jobIds: [] },
      { status: "APPLIED", jobIds: [] },
    ];
    expect(computeNextFocusedJob(emptyColumns, null, "down")).toBeNull();
  });

  it("focuses the first job of the first non-empty column when nothing is focused", () => {
    expect(computeNextFocusedJob(columns, null, "down")).toBe("a");
  });

  it("moves down within a column", () => {
    expect(computeNextFocusedJob(columns, "a", "down")).toBe("b");
  });

  it("stays on the last job when moving down past the end of a column", () => {
    expect(computeNextFocusedJob(columns, "b", "down")).toBe("b");
  });

  it("moves up within a column", () => {
    expect(computeNextFocusedJob(columns, "b", "up")).toBe("a");
  });

  it("stays on the first job when moving up past the start of a column", () => {
    expect(computeNextFocusedJob(columns, "a", "up")).toBe("a");
  });

  it("moves right, skipping empty columns", () => {
    expect(computeNextFocusedJob(columns, "b", "right")).toBe("c");
  });

  it("moves left, skipping empty columns", () => {
    expect(computeNextFocusedJob(columns, "c", "left")).toBe("a");
  });

  it("clamps to the last row when moving into a shorter column", () => {
    expect(computeNextFocusedJob(columns, "f", "left")).toBe("c");
  });

  it("stays put when moving right past the last column", () => {
    expect(computeNextFocusedJob(columns, "d", "right")).toBe("d");
  });

  it("stays put when moving left past the first column", () => {
    expect(computeNextFocusedJob(columns, "a", "left")).toBe("a");
  });

  it("falls back to the first job when the currently focused job no longer exists", () => {
    expect(computeNextFocusedJob(columns, "ghost", "down")).toBe("a");
  });
});

describe("adjacentStatus", () => {
  const order = ["TO_APPLY", "APPLIED", "INTERVIEW", "REJECTED"];

  it("returns the next status", () => {
    expect(adjacentStatus(order, "TO_APPLY", "next")).toBe("APPLIED");
  });

  it("returns the previous status", () => {
    expect(adjacentStatus(order, "INTERVIEW", "prev")).toBe("APPLIED");
  });

  it("returns null past the last status", () => {
    expect(adjacentStatus(order, "REJECTED", "next")).toBeNull();
  });

  it("returns null before the first status", () => {
    expect(adjacentStatus(order, "TO_APPLY", "prev")).toBeNull();
  });

  it("returns null for an unknown status", () => {
    expect(adjacentStatus(order, "UNKNOWN", "next")).toBeNull();
  });
});
