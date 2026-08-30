import { describe, expect, it, vi } from "vitest";
import { probeSmartRecruiters } from "@/lib/harvester/discovery/probe-smartrecruiters";

describe("probeSmartRecruiters", () => {
  it("returns the uppercased company code when postings are found", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      expect(String(input)).toBe("https://api.smartrecruiters.com/v1/companies/ACME/postings?limit=1");
      return new Response(JSON.stringify({ totalFound: 5 }), { status: 200 });
    });

    expect(await probeSmartRecruiters("acme", fetchImpl)).toBe("ACME");
  });

  it("returns undefined when totalFound is 0", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ totalFound: 0 }), { status: 200 }));

    expect(await probeSmartRecruiters("acme", fetchImpl)).toBeUndefined();
  });

  it("returns undefined when the request is not ok", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response("nope", { status: 404 }));

    expect(await probeSmartRecruiters("acme", fetchImpl)).toBeUndefined();
  });
});
