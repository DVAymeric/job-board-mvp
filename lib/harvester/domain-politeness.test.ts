import { describe, it, expect } from "vitest";
import { DomainRateLimiter, waitForDomain } from "@/lib/harvester/domain-politeness";

describe("DomainRateLimiter", () => {
  it("does not delay the first call for a given key", async () => {
    const limiter = new DomainRateLimiter(1000);
    const start = Date.now();
    await limiter.wait("a.example.com");
    expect(Date.now() - start).toBeLessThan(50);
  });

  it("delays a second call for the same key until minDelayMs has elapsed", async () => {
    const limiter = new DomainRateLimiter(200);
    const start = Date.now();
    await limiter.wait("b.example.com");
    await limiter.wait("b.example.com");
    expect(Date.now() - start).toBeGreaterThanOrEqual(180);
  });

  it("does not delay a call for a different key", async () => {
    const limiter = new DomainRateLimiter(1000);
    await limiter.wait("c.example.com");
    const start = Date.now();
    await limiter.wait("d.example.com");
    expect(Date.now() - start).toBeLessThan(50);
  });

  it("does not re-delay a call that arrives after minDelayMs has already elapsed", async () => {
    const limiter = new DomainRateLimiter(50);
    await limiter.wait("e.example.com");
    await new Promise((resolve) => setTimeout(resolve, 60));
    const start = Date.now();
    await limiter.wait("e.example.com");
    expect(Date.now() - start).toBeLessThan(30);
  });
});

describe("waitForDomain", () => {
  it("keys the shared limiter by hostname, not by full URL", async () => {
    // Domaine dédié à ce test (limiteur partagé au niveau module, comme robots.ts) — une
    // première requête sur ce hostname ne doit jamais attendre.
    const start = Date.now();
    await waitForDomain("https://waitfordomain-unique.example/jobs/1");
    expect(Date.now() - start).toBeLessThan(50);
  });
});
