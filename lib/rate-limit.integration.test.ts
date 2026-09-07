import { describe, expect, it, beforeEach, afterEach, afterAll, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { DbSlidingWindowRateLimiter } from "@/lib/rate-limit";

const prisma = new PrismaClient();

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(async () => {
  vi.useRealTimers();
  await prisma.rateLimitBucket.deleteMany({ where: { id: { startsWith: "test:" } } });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("DbSlidingWindowRateLimiter", () => {
  it("allows requests under the limit", async () => {
    const limiter = new DbSlidingWindowRateLimiter(prisma, "test", 3, 60_000);

    expect(await limiter.check("user-1")).toEqual({ allowed: true });
    expect(await limiter.check("user-1")).toEqual({ allowed: true });
    expect(await limiter.check("user-1")).toEqual({ allowed: true });
  });

  it("blocks the request that exceeds the limit within the window", async () => {
    const limiter = new DbSlidingWindowRateLimiter(prisma, "test", 2, 60_000);

    await limiter.check("user-1");
    await limiter.check("user-1");
    const result = await limiter.check("user-1");

    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.retryAfterSeconds).toBeGreaterThan(0);
      expect(result.retryAfterSeconds).toBeLessThanOrEqual(60);
    }
  });

  it("isolates buckets per key", async () => {
    const limiter = new DbSlidingWindowRateLimiter(prisma, "test", 1, 60_000);

    expect(await limiter.check("user-1")).toEqual({ allowed: true });
    expect((await limiter.check("user-1")).allowed).toBe(false);
    expect(await limiter.check("user-2")).toEqual({ allowed: true });
  });

  it("allows requests again once a new window starts", async () => {
    const limiter = new DbSlidingWindowRateLimiter(prisma, "test", 1, 60_000);

    expect(await limiter.check("user-1")).toEqual({ allowed: true });
    expect((await limiter.check("user-1")).allowed).toBe(false);

    vi.advanceTimersByTime(60_001);

    expect(await limiter.check("user-1")).toEqual({ allowed: true });
  });

  it("shares the count across two separate limiter instances (the actual point of JOB-178)", async () => {
    // Simule deux instances serverless distinctes, sans mémoire partagée — chacune sa propre
    // instance de limiter, mais backées par la même table.
    const instanceA = new DbSlidingWindowRateLimiter(prisma, "test", 2, 60_000);
    const instanceB = new DbSlidingWindowRateLimiter(prisma, "test", 2, 60_000);

    expect(await instanceA.check("user-1")).toEqual({ allowed: true });
    expect(await instanceB.check("user-1")).toEqual({ allowed: true });
    // Le plafond (2) est déjà atteint via les deux instances combinées.
    expect((await instanceA.check("user-1")).allowed).toBe(false);
    expect((await instanceB.check("user-1")).allowed).toBe(false);
  });
});
