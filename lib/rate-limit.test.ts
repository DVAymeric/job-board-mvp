import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { InMemorySlidingWindowRateLimiter } from "@/lib/rate-limit";

describe("InMemorySlidingWindowRateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests under the limit", () => {
    const limiter = new InMemorySlidingWindowRateLimiter(3, 60_000);

    expect(limiter.check("user-1")).toEqual({ allowed: true });
    expect(limiter.check("user-1")).toEqual({ allowed: true });
    expect(limiter.check("user-1")).toEqual({ allowed: true });
  });

  it("blocks the request that exceeds the limit within the window", () => {
    const limiter = new InMemorySlidingWindowRateLimiter(2, 60_000);

    limiter.check("user-1");
    limiter.check("user-1");
    const result = limiter.check("user-1");

    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.retryAfterSeconds).toBeGreaterThan(0);
      expect(result.retryAfterSeconds).toBeLessThanOrEqual(60);
    }
  });

  it("isolates buckets per key — one user's usage doesn't affect another's", () => {
    const limiter = new InMemorySlidingWindowRateLimiter(1, 60_000);

    expect(limiter.check("user-1")).toEqual({ allowed: true });
    expect(limiter.check("user-1").allowed).toBe(false);
    expect(limiter.check("user-2")).toEqual({ allowed: true });
  });

  it("allows requests again once the window has fully elapsed", () => {
    const limiter = new InMemorySlidingWindowRateLimiter(1, 60_000);

    expect(limiter.check("user-1")).toEqual({ allowed: true });
    expect(limiter.check("user-1").allowed).toBe(false);

    vi.advanceTimersByTime(60_001);

    expect(limiter.check("user-1")).toEqual({ allowed: true });
  });

  it("evicts only the expired hits, not the whole window (sliding, not fixed)", () => {
    const limiter = new InMemorySlidingWindowRateLimiter(2, 10_000);

    limiter.check("user-1"); // t=0
    vi.advanceTimersByTime(6_000); // t=6s
    limiter.check("user-1"); // t=6s, 2 hits in window
    expect(limiter.check("user-1").allowed).toBe(false); // t=6s, 3rd hit blocked

    vi.advanceTimersByTime(4_001); // t=10.001s — the t=0 hit has now expired
    // Only the t=6s hit remains in the 10s window, so this one is allowed.
    expect(limiter.check("user-1")).toEqual({ allowed: true });
  });

  it("clears all buckets on reset, allowing previously-blocked keys through again", () => {
    const limiter = new InMemorySlidingWindowRateLimiter(1, 60_000);

    expect(limiter.check("user-1")).toEqual({ allowed: true });
    expect(limiter.check("user-1").allowed).toBe(false);

    limiter.reset();

    expect(limiter.check("user-1")).toEqual({ allowed: true });
  });
});
