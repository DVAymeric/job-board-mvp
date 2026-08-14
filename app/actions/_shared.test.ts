import { describe, expect, it, vi, beforeEach } from "vitest";
import { logActionError } from "@/app/actions/_shared";
import { logger } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

describe("logActionError (JOB-113)", () => {
  beforeEach(() => {
    vi.mocked(logger.error).mockReset();
    vi.mocked(logger.warn).mockReset();
    vi.mocked(Sentry.captureException).mockReset();
  });

  it("reports error-level failures to Sentry with the action tag", () => {
    const error = new Error("boom");
    logActionError("createJob", error);

    expect(logger.error).toHaveBeenCalledWith(
      "action.failed",
      expect.objectContaining({ action: "createJob", error: "boom" })
    );
    expect(Sentry.captureException).toHaveBeenCalledWith(
      error,
      expect.objectContaining({ tags: { action: "createJob" } })
    );
  });

  it("attaches the userId as Sentry user context when a verified session is known", () => {
    const error = new Error("boom");
    logActionError("createJob", error, { userId: "user-1" });

    expect(Sentry.captureException).toHaveBeenCalledWith(
      error,
      expect.objectContaining({ user: { id: "user-1" } })
    );
  });

  it("does not set a Sentry user when no userId is provided", () => {
    logActionError("checkJobUrl", new Error("boom"));

    const call = vi.mocked(Sentry.captureException).mock.calls[0];
    expect(call[1]).not.toHaveProperty("user");
  });

  it("does not report warn-level failures to Sentry (expected conditions, not bugs)", () => {
    logActionError("checkJobUrl", new Error("rate limited"), undefined, "warn");

    expect(logger.warn).toHaveBeenCalled();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });
});
