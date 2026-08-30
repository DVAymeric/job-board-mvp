import { describe, expect, it, vi } from "vitest";
import { probeDigitalRecruiters } from "@/lib/harvester/discovery/probe-digitalrecruiters";

describe("probeDigitalRecruiters", () => {
  it("returns the joinus domain when the API responds with a numeric count", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      expect(String(input)).toBe(
        "https://api.digitalrecruiters.com/public/v1/careers-site/job-ads?domainName=joinus.acme.fr&limit=1&page=1&locale=fr_FR"
      );
      return new Response(JSON.stringify({ count: 3 }), { status: 200 });
    });

    expect(await probeDigitalRecruiters("acme", fetchImpl)).toBe("joinus.acme.fr");
  });

  it("returns undefined when the response is not ok", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response("nope", { status: 404 }));

    expect(await probeDigitalRecruiters("acme", fetchImpl)).toBeUndefined();
  });

  it("returns undefined when the body has no numeric count", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({}), { status: 200 }));

    expect(await probeDigitalRecruiters("acme", fetchImpl)).toBeUndefined();
  });
});
