import { describe, it, expect, vi } from "vitest";
import type { HarvestQuery } from "@/lib/harvester/harvest-query";
import { fetchWorkdayOffers, checkWorkdayHealth } from "@/lib/harvester/connectors/workday/client";
import { logger } from "@/lib/logger";

const query: HarvestQuery = {
  campaignId: "test",
  keywords: [],
  romeCodes: [],
  location: { label: "Lille", lat: 50.63, lng: 3.05, radiusKm: 30 },
  contractTypes: ["apprentissage"],
  targets: { workday: [{ tenant: "valeo", site: "valeo_jobs", dc: "wd3" }] },
};

const searchResponseBody = JSON.stringify({
  total: 1,
  jobPostings: [{ title: "Alternant Data Analyst", externalPath: "/job/Lille/Alternant-Data-Analyst_REQ2026000111" }],
});

const detailResponseBody = JSON.stringify({
  jobPostingInfo: {
    title: "Alternant Data Analyst",
    jobDescription: "<p>Une alternance data.</p>",
    location: "Lille",
    jobReqId: "REQ2026000111",
    externalUrl: "https://valeo.wd3.myworkdayjobs.com/valeo_jobs/job/Lille/Alternant-Data-Analyst_REQ2026000111",
  },
});

describe("fetchWorkdayOffers", () => {
  it("fetches the list for each target, fetches detail per item, and yields a composite raw offer", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);
      if (url.endsWith("/jobs")) {
        return new Response(searchResponseBody, { status: 200 });
      }
      return new Response(detailResponseBody, { status: 200 });
    });

    const results: unknown[] = [];
    for await (const item of fetchWorkdayOffers(query, { fetchImpl })) {
      results.push(item);
    }

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      target: { tenant: "valeo", site: "valeo_jobs", dc: "wd3" },
      externalPath: "/job/Lille/Alternant-Data-Analyst_REQ2026000111",
      jobPostingInfo: { title: "Alternant Data Analyst" },
    });

    const searchCall = fetchImpl.mock.calls.find(([input]) => String(input).endsWith("/jobs"))!;
    expect(String(searchCall[0])).toBe("https://valeo.wd3.myworkdayjobs.com/wday/cxs/valeo/valeo_jobs/jobs");
  });

  it("pages through the job list until total is reached (JOB-32)", async () => {
    const requestedOffsets: number[] = [];
    const fetchImpl = vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input);
      if (url.endsWith("/jobs")) {
        const body = JSON.parse(init!.body as string) as { offset: number };
        requestedOffsets.push(body.offset);
        // 25 total postings, page size 20: page 1 = 20 items, page 2 = 5 items.
        const count = body.offset === 0 ? 20 : 5;
        const jobPostings = Array.from({ length: count }, (_, i) => ({
          title: `Alternant ${body.offset + i}`,
          externalPath: `/job/Lille/x_REQ${body.offset + i}`,
        }));
        return new Response(JSON.stringify({ total: 25, jobPostings }), { status: 200 });
      }
      return new Response(
        JSON.stringify({ jobPostingInfo: { title: "x", jobDescription: "d", jobReqId: url, externalUrl: `https://x/${url}` } }),
        { status: 200 },
      );
    });

    const results: unknown[] = [];
    for await (const item of fetchWorkdayOffers(query, { fetchImpl })) {
      results.push(item);
    }

    expect(requestedOffsets).toEqual([0, 20]);
    expect(results).toHaveLength(25);
  });

  it("logs a warning when MAX_LIST_PAGES is reached with more results still available (JOB-166)", async () => {
    const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);
      if (url.endsWith("/jobs")) {
        // Full pages forever, total far beyond what MAX_LIST_PAGES × LIST_PAGE_SIZE can reach.
        const jobPostings = Array.from({ length: 20 }, (_, i) => ({ title: `Alternant ${i}`, externalPath: `/job/x_${i}` }));
        return new Response(JSON.stringify({ total: 100_000, jobPostings }), { status: 200 });
      }
      return new Response(detailResponseBody, { status: 200 });
    });

    for await (const _item of fetchWorkdayOffers(query, { fetchImpl })) {
      // drain
    }

    expect(warnSpy).toHaveBeenCalledWith(
      "harvester.workday.pagination_cap_reached",
      expect.objectContaining({ tenant: "valeo", site: "valeo_jobs" }),
    );
    warnSpy.mockRestore();
  });

  it("skips the target (does not throw) when the search request is not ok (JOB-169)", async () => {
    const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response("nope", { status: 500 }));

    const results: unknown[] = [];
    for await (const item of fetchWorkdayOffers(query, { fetchImpl })) {
      results.push(item);
    }

    expect(results).toHaveLength(0);
    expect(warnSpy).toHaveBeenCalledWith(
      "harvester.workday.target_skipped",
      expect.objectContaining({ tenant: "valeo", reason: expect.stringContaining("HTTP 500") }),
    );
    warnSpy.mockRestore();
  });

  it("isolates a failing tenant instead of aborting the whole campaign (JOB-169)", async () => {
    const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});
    const twoTenantsQuery: HarvestQuery = {
      ...query,
      targets: {
        workday: [
          { tenant: "broken", site: "broken_jobs", dc: "wd3" },
          { tenant: "valeo", site: "valeo_jobs", dc: "wd3" },
        ],
      },
    };
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);
      if (url.includes("broken.wd3")) {
        throw new Error("network down");
      }
      if (url.endsWith("/jobs")) {
        return new Response(searchResponseBody, { status: 200 });
      }
      return new Response(detailResponseBody, { status: 200 });
    });

    const results: unknown[] = [];
    for await (const item of fetchWorkdayOffers(twoTenantsQuery, { fetchImpl })) {
      results.push(item);
    }

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ target: { tenant: "valeo" } });
    expect(warnSpy).toHaveBeenCalledWith(
      "harvester.workday.target_skipped",
      expect.objectContaining({ tenant: "broken", site: "broken_jobs" }),
    );
    warnSpy.mockRestore();
  });

  it("searches with \"stage\" instead of the hardcoded \"alternance\" term when contractTypes is [\"stage\"] (JOB-74)", async () => {
    const searchTexts: string[] = [];
    const fetchImpl = vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input);
      if (url.endsWith("/jobs")) {
        const body = JSON.parse(init!.body as string) as { searchText: string };
        searchTexts.push(body.searchText);
        return new Response(JSON.stringify({ total: 0, jobPostings: [] }), { status: 200 });
      }
      return new Response(detailResponseBody, { status: 200 });
    });

    const stageQuery: HarvestQuery = { ...query, contractTypes: ["stage"] };
    for await (const _item of fetchWorkdayOffers(stageQuery, { fetchImpl })) {
      // drain
    }

    expect(searchTexts).toEqual(["stage"]);
  });

  it("queries once per distinct contract-type search term and dedupes results across them (JOB-74)", async () => {
    const searchTexts: string[] = [];
    const fetchImpl = vi.fn<typeof fetch>(async (input, init) => {
      const url = String(input);
      if (url.endsWith("/jobs")) {
        const body = JSON.parse(init!.body as string) as { searchText: string };
        searchTexts.push(body.searchText);
        // "Stagiaire Data" surfaces under both the "alternance" and "stage" searches — must not
        // be yielded twice.
        return new Response(
          JSON.stringify({
            total: 1,
            jobPostings: [{ title: "Stagiaire Data", externalPath: "/job/Lille/Stagiaire-Data_REQ1" }],
          }),
          { status: 200 },
        );
      }
      return new Response(detailResponseBody, { status: 200 });
    });

    const mixedQuery: HarvestQuery = { ...query, contractTypes: ["apprentissage", "stage"] };
    const results: unknown[] = [];
    for await (const item of fetchWorkdayOffers(mixedQuery, { fetchImpl })) {
      results.push(item);
    }

    expect(searchTexts).toEqual(["alternance", "stage"]);
    expect(results).toHaveLength(1);
  });
});

describe("checkWorkdayHealth", () => {
  it("reports ok:true when the search request against the health-check tenant succeeds", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ total: 0, jobPostings: [] }), { status: 200 }));
    const health = await checkWorkdayHealth({ fetchImpl });
    expect(health).toMatchObject({ connectorId: "workday", ok: true });
  });

  it("reports ok:false with a message when the request fails", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response("nope", { status: 500 }));
    const health = await checkWorkdayHealth({ fetchImpl });
    expect(health).toMatchObject({ connectorId: "workday", ok: false });
  });
});
