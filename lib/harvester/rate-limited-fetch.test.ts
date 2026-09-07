import { describe, it, expect, vi, afterEach } from "vitest";
import { createRateLimitedFetch } from "@/lib/harvester/rate-limited-fetch";
import { logger } from "@/lib/logger";

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

function jsonResponse(status: number): Response {
  return new Response(null, { status });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createRateLimitedFetch", () => {
  it("throttles a second call to the same domain but not a call to a different domain", async () => {
    const baseFetch = vi.fn(async () => jsonResponse(200));
    const rateLimitedFetch = createRateLimitedFetch(baseFetch as unknown as typeof fetch, {
      bucketCapacity: 1,
      refillPerSecond: 5, // 1 token every 200ms
    });

    const start = Date.now();
    await rateLimitedFetch("https://a.example.com/jobs");
    await rateLimitedFetch("https://a.example.com/jobs"); // must wait ~200ms (bucket empty)
    const afterSameDomain = Date.now() - start;

    await rateLimitedFetch("https://b.example.com/jobs"); // fresh bucket, must not wait
    const afterDifferentDomain = Date.now() - start;

    expect(afterSameDomain).toBeGreaterThanOrEqual(180);
    expect(afterDifferentDomain - afterSameDomain).toBeLessThan(100);
  });

  it("retries on a 429 and returns the eventual success", async () => {
    const baseFetch = vi.fn().mockResolvedValueOnce(jsonResponse(429)).mockResolvedValueOnce(jsonResponse(200));
    const rateLimitedFetch = createRateLimitedFetch(baseFetch as unknown as typeof fetch, {
      bucketCapacity: 10,
      refillPerSecond: 100,
      baseDelayMs: 10,
    });

    const response = await rateLimitedFetch("https://example.com/jobs");

    expect(response.status).toBe(200);
    expect(baseFetch).toHaveBeenCalledTimes(2);
  });

  it("gives up after 3 attempts and returns the last failing response", async () => {
    const baseFetch = vi.fn(async () => jsonResponse(503));
    const rateLimitedFetch = createRateLimitedFetch(baseFetch as unknown as typeof fetch, {
      bucketCapacity: 10,
      refillPerSecond: 100,
      baseDelayMs: 5,
    });

    const response = await rateLimitedFetch("https://example.com/jobs");

    expect(response.status).toBe(503);
    expect(baseFetch).toHaveBeenCalledTimes(3);
  });

  it("does not retry a plain 200 (no wasted attempts)", async () => {
    const baseFetch = vi.fn(async () => jsonResponse(200));
    const rateLimitedFetch = createRateLimitedFetch(baseFetch as unknown as typeof fetch, {
      bucketCapacity: 10,
      refillPerSecond: 100,
      baseDelayMs: 5,
    });

    await rateLimitedFetch("https://example.com/jobs");

    expect(baseFetch).toHaveBeenCalledTimes(1);
  });

  it("applies increasing backoff delays between retries (full jitter at its maximum)", async () => {
    vi.spyOn(Math, "random").mockReturnValue(1); // full jitter always picks the max of the range
    const baseFetch = vi.fn().mockResolvedValueOnce(jsonResponse(500)).mockResolvedValueOnce(jsonResponse(500)).mockResolvedValueOnce(jsonResponse(200));
    const rateLimitedFetch = createRateLimitedFetch(baseFetch as unknown as typeof fetch, {
      bucketCapacity: 10,
      refillPerSecond: 100,
      baseDelayMs: 30,
    });

    const start = Date.now();
    const response = await rateLimitedFetch("https://example.com/jobs");
    const elapsed = Date.now() - start;

    expect(response.status).toBe(200);
    expect(elapsed).toBeGreaterThanOrEqual(85); // ~30ms + ~60ms, minus small scheduling slack
  });

  it("logs a warning identifying the hostname when a 403 is received, without forcing a retry (JOB-174)", async () => {
    const baseFetch = vi.fn(async () => jsonResponse(403));
    const rateLimitedFetch = createRateLimitedFetch(baseFetch as unknown as typeof fetch, {
      bucketCapacity: 10,
      refillPerSecond: 100,
      baseDelayMs: 5,
    });

    const response = await rateLimitedFetch("https://example.com/jobs");

    expect(response.status).toBe(403);
    expect(baseFetch).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      "harvester.rate_limited_fetch.likely_blocked",
      expect.objectContaining({ hostname: "example.com", status: 403 }),
    );
  });

  it("keeps doubling the delay past the old 2-step schedule when maxAttempts is raised (JOB-182)", async () => {
    vi.spyOn(Math, "random").mockReturnValue(1); // full jitter always picks the max of the range
    const baseFetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(500))
      .mockResolvedValueOnce(jsonResponse(500))
      .mockResolvedValueOnce(jsonResponse(500))
      .mockResolvedValueOnce(jsonResponse(200));
    const rateLimitedFetch = createRateLimitedFetch(baseFetch as unknown as typeof fetch, {
      bucketCapacity: 10,
      refillPerSecond: 100,
      baseDelayMs: 10,
      maxAttempts: 4,
    });

    const start = Date.now();
    const response = await rateLimitedFetch("https://example.com/jobs");
    const elapsed = Date.now() - start;

    expect(response.status).toBe(200);
    expect(baseFetch).toHaveBeenCalledTimes(4);
    // 10ms + 20ms + 40ms = 70ms — a fixed 2-entry schedule would have plateaued at 10+20+20=50ms.
    expect(elapsed).toBeGreaterThanOrEqual(65);
  });

  it("propagates thrown/network errors immediately without retry", async () => {
    const testError = new Error("Network timeout");
    const baseFetch = vi.fn().mockRejectedValue(testError);
    const rateLimitedFetch = createRateLimitedFetch(baseFetch as unknown as typeof fetch, {
      bucketCapacity: 10,
      refillPerSecond: 100,
      baseDelayMs: 5,
    });

    await expect(rateLimitedFetch("https://example.com/jobs")).rejects.toBe(testError);
    expect(baseFetch).toHaveBeenCalledTimes(1);
  });
});
