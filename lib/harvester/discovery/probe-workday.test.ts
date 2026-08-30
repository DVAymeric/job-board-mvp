import { describe, expect, it, vi } from "vitest";
import { probeWorkday } from "@/lib/harvester/discovery/probe-workday";

describe("probeWorkday", () => {
  it("returns the tenant/site/dc when the first datacenter responds ok", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      expect(String(input)).toBe("https://acme.wd1.myworkdayjobs.com/wday/cxs/acme/acme_jobs/jobs");
      return new Response("{}", { status: 200 });
    });

    const target = await probeWorkday("acme", fetchImpl);

    expect(target).toEqual({ tenant: "acme", site: "acme_jobs", dc: "wd1" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("falls through datacenters wd1 -> wd3 -> wd5 until one responds ok", async () => {
    let call = 0;
    const fetchImpl = vi.fn<typeof fetch>(async () => {
      call += 1;
      if (call < 3) return new Response("nope", { status: 404 });
      return new Response("{}", { status: 200 });
    });

    const target = await probeWorkday("acme", fetchImpl);

    expect(target).toEqual({ tenant: "acme", site: "acme_jobs", dc: "wd5" });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("returns undefined when no datacenter responds ok", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response("nope", { status: 404 }));

    const target = await probeWorkday("acme", fetchImpl);

    expect(target).toBeUndefined();
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("treats a thrown fetch (network error/timeout) on one datacenter as not-found for that one, tries the next", async () => {
    let call = 0;
    const fetchImpl = vi.fn<typeof fetch>(async () => {
      call += 1;
      if (call === 1) throw new Error("network unreachable");
      return new Response("{}", { status: 200 });
    });

    const target = await probeWorkday("acme", fetchImpl);

    expect(target).toEqual({ tenant: "acme", site: "acme_jobs", dc: "wd3" });
  });

  it("derives tenant by stripping hyphens from a multi-word slug", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      expect(String(input)).toBe("https://acmeone.wd1.myworkdayjobs.com/wday/cxs/acmeone/acmeone_jobs/jobs");
      return new Response("{}", { status: 200 });
    });

    await probeWorkday("acme-one", fetchImpl);
  });
});
