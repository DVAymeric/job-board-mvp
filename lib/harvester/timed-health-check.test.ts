import { describe, it, expect, vi, afterEach } from "vitest";
import { timedHealthCheck, healthCheckWithTimeout } from "@/lib/harvester/timed-health-check";

describe("timedHealthCheck", () => {
  it("reports ok:true from a successful Response probe", async () => {
    const health = await timedHealthCheck("fake", async () => new Response("{}", { status: 200 }));
    expect(health).toMatchObject({ connectorId: "fake", ok: true });
    expect(health.message).toBeUndefined();
  });

  it("reports ok:false with an HTTP message from a non-ok Response probe", async () => {
    const health = await timedHealthCheck("fake", async () => new Response("nope", { status: 500 }));
    expect(health).toMatchObject({ connectorId: "fake", ok: false, message: "HTTP 500" });
  });

  it("reports ok:false with the error message when the probe throws", async () => {
    const health = await timedHealthCheck("fake", async () => {
      throw new Error("network down");
    });
    expect(health).toMatchObject({ connectorId: "fake", ok: false, message: "network down" });
  });

  it("reports ok:true when the probe resolves without returning a Response (JOB-25/JOB-26 pattern)", async () => {
    const health = await timedHealthCheck("fake", async () => "some-token");
    expect(health).toMatchObject({ connectorId: "fake", ok: true });
  });
});

describe("healthCheckWithTimeout", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves with the connector's own result when it answers before the deadline", async () => {
    const health = await healthCheckWithTimeout(
      "fake",
      async () => ({ connectorId: "fake", ok: true, latencyMs: 5, checkedAt: "2026-08-19T00:00:00.000Z" }),
      1000
    );
    expect(health).toMatchObject({ connectorId: "fake", ok: true });
  });

  it("reports ok:false with a timeout message when the connector never settles within the budget", async () => {
    vi.useFakeTimers();
    const hung = new Promise<never>(() => {});
    const resultPromise = healthCheckWithTimeout("slow-connector", () => hung, 5000);

    await vi.advanceTimersByTimeAsync(5000);
    const health = await resultPromise;

    expect(health).toMatchObject({ connectorId: "slow-connector", ok: false, message: "Timeout after 5000ms" });
  });
});
