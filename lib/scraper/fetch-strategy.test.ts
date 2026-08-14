import { describe, expect, it, vi, beforeEach } from "vitest";
import { fetchMetadataViaHttp } from "@/lib/scraper/fetch-strategy";
import { safeFetch } from "@/lib/safe-fetch";
import { logger } from "@/lib/logger";

vi.mock("@/lib/safe-fetch", () => ({
  safeFetch: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const EMPTY = { title: null, companyName: null, descriptionText: null };

describe("fetchMetadataViaHttp", () => {
  beforeEach(() => {
    vi.mocked(safeFetch).mockReset();
    vi.mocked(logger.info).mockReset();
    vi.mocked(logger.warn).mockReset();
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

  it("logs a Cheerio-only success (for the success-rate metric vs Playwright fallback)", async () => {
    vi.mocked(safeFetch).mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        `<meta property="og:title" content="Développeur Backend" />`,
    } as Response);

    await fetchMetadataViaHttp("https://example.com/job", { userId: "user-1" });

    expect(logger.info).toHaveBeenCalledWith(
      "scraper.fetch_ok",
      expect.objectContaining({
        url: "https://example.com/job",
        status: 200,
        userId: "user-1",
      })
    );
  });

  it("returns empty metadata when the response is not ok", async () => {
    vi.mocked(safeFetch).mockResolvedValue({ ok: false, status: 404 } as Response);

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

  it.each([401, 403, 429, 503])(
    "flags status %i as a likely anti-bot block when logging the non-ok response",
    async (status) => {
      vi.mocked(safeFetch).mockResolvedValue({ ok: false, status } as Response);

      await fetchMetadataViaHttp("https://example.com/job");

      expect(logger.warn).toHaveBeenCalledWith(
        "scraper.fetch_not_ok",
        expect.objectContaining({
          url: "https://example.com/job",
          status,
          likelyAntiBotBlock: true,
        })
      );
    }
  );

  it("does not flag an ordinary non-ok status (e.g. 404) as an anti-bot block", async () => {
    vi.mocked(safeFetch).mockResolvedValue({ ok: false, status: 404 } as Response);

    await fetchMetadataViaHttp("https://example.com/job");

    expect(logger.warn).toHaveBeenCalledWith(
      "scraper.fetch_not_ok",
      expect.objectContaining({ status: 404, likelyAntiBotBlock: false })
    );
  });

  it("logs when the page is fetched successfully but no title could be extracted", async () => {
    vi.mocked(safeFetch).mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => "<html><body>No metadata here</body></html>",
    } as Response);

    await fetchMetadataViaHttp("https://example.com/job");

    expect(logger.info).toHaveBeenCalledWith(
      "scraper.no_title_found",
      expect.objectContaining({ url: "https://example.com/job", status: 200 })
    );
  });

  it("does not log a missing-title notice when a title is found", async () => {
    vi.mocked(safeFetch).mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => `<meta property="og:title" content="Développeur Backend" />`,
    } as Response);

    await fetchMetadataViaHttp("https://example.com/job");

    expect(logger.info).not.toHaveBeenCalledWith(
      "scraper.no_title_found",
      expect.anything()
    );
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
        headers: expect.objectContaining({ Accept: "text/html" }),
        signal: expect.any(AbortSignal),
      })
    );
  });

  it("sends a realistic desktop User-Agent and Accept-Language to avoid basic anti-bot blocks", async () => {
    vi.mocked(safeFetch).mockResolvedValue({
      ok: true,
      text: async () => "",
    } as Response);

    await fetchMetadataViaHttp("https://example.com/job");

    const [, init] = vi.mocked(safeFetch).mock.calls[0];
    const headers = init?.headers as Record<string, string>;
    expect(headers["User-Agent"]).toMatch(/Mozilla\/5\.0/);
    expect(headers["Accept-Language"]).toMatch(/^fr-FR/);
  });

  it("attaches the userId to scraping logs when the caller has an authenticated context", async () => {
    vi.mocked(safeFetch).mockResolvedValue({ ok: false, status: 403 } as Response);

    await fetchMetadataViaHttp("https://example.com/job", { userId: "user-1" });

    expect(logger.warn).toHaveBeenCalledWith(
      "scraper.fetch_not_ok",
      expect.objectContaining({ userId: "user-1" })
    );
  });

  it("omits userId from scraping logs for anonymous callers (no context)", async () => {
    vi.mocked(safeFetch).mockResolvedValue({ ok: false, status: 403 } as Response);

    await fetchMetadataViaHttp("https://example.com/job");

    const [, fields] = vi.mocked(logger.warn).mock.calls[0];
    expect(fields).not.toHaveProperty("userId");
  });
});
