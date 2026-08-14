import { describe, expect, it } from "vitest";
import { ACTION_ERROR_CODES } from "@/lib/types";

describe("ACTION_ERROR_CODES", () => {
  it("is a non-empty list of unique, stable codes", () => {
    expect(ACTION_ERROR_CODES.length).toBeGreaterThan(0);
    expect(new Set(ACTION_ERROR_CODES).size).toBe(ACTION_ERROR_CODES.length);
  });

  it("includes the core failure categories used across Server Actions", () => {
    expect(ACTION_ERROR_CODES).toEqual(
      expect.arrayContaining([
        "UNAUTHENTICATED",
        "VALIDATION_ERROR",
        "RATE_LIMITED",
        "NOT_FOUND",
        "CONFLICT",
        "INTERNAL_ERROR",
      ])
    );
  });
});
