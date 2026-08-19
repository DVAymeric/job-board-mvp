import { describe, it, expect, vi, beforeEach } from "vitest";

const { isAllowedByRobots, extractJobPostings, fetchRenderedHtml } = vi.hoisted(() => ({
  isAllowedByRobots: vi.fn(),
  extractJobPostings: vi.fn(),
  fetchRenderedHtml: vi.fn(),
}));

vi.mock("@/lib/harvester/robots", () => ({ isAllowedByRobots }));
vi.mock("@/lib/harvester/jsonld", () => ({ extractJobPostings }));
vi.mock("@/lib/harvester/headless", () => ({ fetchRenderedHtml }));

import { fetchJsonLdGenericOffers, checkJsonLdGenericHealth } from "@/lib/harvester/connectors/jsonld-generic/client";
import type { HarvestQuery } from "@/lib/harvester/harvest-query";

function makeFetch(html: string, ok = true): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    text: () => Promise.resolve(html),
  }) as unknown as typeof fetch;
}

function baseQuery(jsonldGeneric: string[]): HarvestQuery {
  return {
    campaignId: "test",
    keywords: [],
    romeCodes: [],
    location: { label: "Lille", lat: 50.63, lng: 3.05, radiusKm: 30 },
    contractTypes: ["apprentissage"],
    targets: { jsonldGeneric },
  };
}

async function collect<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const item of iterable) out.push(item);
  return out;
}

describe("fetchJsonLdGenericOffers", () => {
  beforeEach(() => {
    isAllowedByRobots.mockReset();
    extractJobPostings.mockReset();
    fetchRenderedHtml.mockReset();
  });

  it("fetches a page allowed by robots.txt and yields the extracted JSON-LD job postings", async () => {
    const query = baseQuery(["https://careers.acme.example/jobs/1"]);
    isAllowedByRobots.mockResolvedValue(true);
    extractJobPostings.mockReturnValue([{ title: "Dev" }]);
    const fetchImpl = makeFetch("<html></html>");

    const results = await collect(fetchJsonLdGenericOffers(query, { fetchImpl }));

    expect(results).toEqual([{ pageUrl: "https://careers.acme.example/jobs/1", jobPosting: { title: "Dev" } }]);
    expect(fetchRenderedHtml).not.toHaveBeenCalled();
  });

  it("skips a target disallowed by robots.txt", async () => {
    const query = baseQuery(["https://careers.acme.example/jobs/1"]);
    isAllowedByRobots.mockResolvedValue(false);
    const fetchImpl = makeFetch("<html></html>");

    const results = await collect(fetchJsonLdGenericOffers(query, { fetchImpl }));

    expect(results).toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("skips a target whose fetch fails and continues to the next one", async () => {
    const query = baseQuery(["https://careers.acme.example/jobs/broken", "https://careers.acme.example/jobs/ok"]);
    isAllowedByRobots.mockResolvedValue(true);
    extractJobPostings.mockReturnValue([{ title: "Dev" }]);
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce({ ok: true, status: 200, text: () => Promise.resolve("<html></html>") }) as unknown as typeof fetch;

    const results = await collect(fetchJsonLdGenericOffers(query, { fetchImpl }));

    expect(results).toEqual([{ pageUrl: "https://careers.acme.example/jobs/ok", jobPosting: { title: "Dev" } }]);
  });

  it("falls back to the headless renderer when static HTML has no JSON-LD, then yields what it finds", async () => {
    const query = baseQuery(["https://careers.acme.example/jobs/js-only"]);
    isAllowedByRobots.mockResolvedValue(true);
    extractJobPostings.mockReturnValueOnce([]).mockReturnValueOnce([{ title: "Dev rendu" }]);
    fetchRenderedHtml.mockResolvedValue("<html>rendered</html>");
    const fetchImpl = makeFetch("<html>static</html>");

    const results = await collect(fetchJsonLdGenericOffers(query, { fetchImpl }));

    expect(fetchRenderedHtml).toHaveBeenCalledWith("https://careers.acme.example/jobs/js-only");
    expect(results).toEqual([{ pageUrl: "https://careers.acme.example/jobs/js-only", jobPosting: { title: "Dev rendu" } }]);
  });
});

describe("checkJsonLdGenericHealth", () => {
  it("reports healthy since there is no single fixed endpoint to probe", async () => {
    const health = await checkJsonLdGenericHealth({});
    expect(health.connectorId).toBe("jsonld-generic");
    expect(health.ok).toBe(true);
  });
});
