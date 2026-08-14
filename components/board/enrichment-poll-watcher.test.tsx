import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { EnrichmentPollWatcher } from "@/components/board/enrichment-poll-watcher";

describe("EnrichmentPollWatcher (JOB-ASYNC-ENRICH)", () => {
  const reload = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    reload.mockReset();
    vi.stubGlobal("location", { ...window.location, reload });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("does nothing when no job is pending enrichment", () => {
    render(<EnrichmentPollWatcher hasPendingEnrichment={false} />);
    vi.advanceTimersByTime(10_000);
    expect(reload).not.toHaveBeenCalled();
  });

  it("reloads the page periodically while a job is pending enrichment", () => {
    render(<EnrichmentPollWatcher hasPendingEnrichment={true} />);
    vi.advanceTimersByTime(3000);
    expect(reload).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(3000);
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it("stops polling once no job is pending anymore", () => {
    const { rerender } = render(<EnrichmentPollWatcher hasPendingEnrichment={true} />);
    vi.advanceTimersByTime(3000);
    expect(reload).toHaveBeenCalledTimes(1);

    rerender(<EnrichmentPollWatcher hasPendingEnrichment={false} />);
    vi.advanceTimersByTime(10_000);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
