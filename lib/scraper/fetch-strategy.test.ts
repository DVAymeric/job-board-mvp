import { describe, expect, it, vi, beforeEach } from "vitest";
import { fetchMetadataViaHttp } from "@/lib/scraper/fetch-strategy";
import { safeFetch } from "@/lib/safe-fetch";

vi.mock("@/lib/safe-fetch", () => ({
  safeFetch: vi.fn(),
}));

const EMPTY = { title: null, companyName: null, descriptionText: null };

describe("fetchMetadataViaHttp", () => {
  beforeEach(() => {
    vi.mocked(safeFetch).mockReset();
  });

  it("parses metadata from the fetched HTML on success", async () => {
    vi.mocked(safeFetch).mockResolvedValue({
      ok: true,
      text: async () =>
        `<meta property="og:title" content="Développeur Backend" />`,
    } as Response);

    const result = await fetchMetadataViaHttp("https://example.com/job");

    expect(result).toEqual({
      title: "Développeur Backend",
      companyName: null,
      descriptionText: null,
    });
  });

  it("returns empty metadata when the response is not ok", async () => {
    vi.mocked(safeFetch).mockResolvedValue({ ok: false } as Response);

    const result = await fetchMetadataViaHttp("https://example.com/job");

    expect(result).toEqual(EMPTY);
  });

  it("returns empty metadata when safeFetch resolves to null (blocked target)", async () => {
    vi.mocked(safeFetch).mockResolvedValue(null as unknown as Response);

    const result = await fetchMetadataViaHttp("https://example.com/job");

    expect(result).toEqual(EMPTY);
  });

  it("returns empty metadata when the fetch throws (timeout, network error)", async () => {
    vi.mocked(safeFetch).mockRejectedValue(new Error("network error"));

    const result = await fetchMetadataViaHttp("https://example.com/job");

    expect(result).toEqual(EMPTY);
  });

  it("requests HTML explicitly and bounds the request with a timeout signal", async () => {
    vi.mocked(safeFetch).mockResolvedValue({
      ok: true,
      text: async () => "",
    } as Response);

    await fetchMetadataViaHttp("https://example.com/job");

    expect(safeFetch).toHaveBeenCalledWith(
      "https://example.com/job",
      expect.objectContaining({
        headers: { Accept: "text/html" },
        signal: expect.any(AbortSignal),
      })
    );
  });
});
