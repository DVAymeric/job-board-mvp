import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { scrapeJobMetadata } from "@/lib/scraper";
import { fetchMetadataViaHttp } from "@/lib/scraper/fetch-strategy";
import { fetchMetadataViaPlaywright } from "@/lib/scraper/playwright-strategy";
import { logger } from "@/lib/logger";

vi.mock("@/lib/scraper/fetch-strategy", () => ({
  fetchMetadataViaHttp: vi.fn(),
}));

vi.mock("@/lib/scraper/playwright-strategy", () => ({
  fetchMetadataViaPlaywright: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const EMPTY = { title: null, companyName: null, descriptionText: null };

describe("scrapeJobMetadata", () => {
  beforeEach(() => {
    vi.mocked(fetchMetadataViaHttp).mockReset();
    vi.mocked(fetchMetadataViaPlaywright).mockReset();
    vi.mocked(logger.info).mockReset();
  });

  it("returns the HTTP strategy's result directly when it finds a title", async () => {
    const metadata = {
      title: "Développeur Backend",
      companyName: "Acme",
      descriptionText: null,
    };
    vi.mocked(fetchMetadataViaHttp).mockResolvedValue(metadata);

    const result = await scrapeJobMetadata("https://example.com/job");

    expect(fetchMetadataViaHttp).toHaveBeenCalledWith("https://example.com/job", undefined);
    expect(fetchMetadataViaPlaywright).not.toHaveBeenCalled();
    expect(result).toEqual(metadata);
  });

  it("falls back to the Playwright strategy when the HTTP strategy finds no title", async () => {
    vi.mocked(fetchMetadataViaHttp).mockResolvedValue(EMPTY);
    const playwrightResult = {
      title: "Développeur Backend",
      companyName: "Acme",
      descriptionText: null,
    };
    vi.mocked(fetchMetadataViaPlaywright).mockResolvedValue(playwrightResult);

    const result = await scrapeJobMetadata("https://example.com/job");

    expect(fetchMetadataViaPlaywright).toHaveBeenCalledWith("https://example.com/job", undefined);
    expect(result).toEqual(playwrightResult);
  });

  it("threads the authenticated context through both strategies", async () => {
    vi.mocked(fetchMetadataViaHttp).mockResolvedValue(EMPTY);
    vi.mocked(fetchMetadataViaPlaywright).mockResolvedValue(EMPTY);

    await scrapeJobMetadata("https://example.com/job", { userId: "user-1" });

    expect(fetchMetadataViaHttp).toHaveBeenCalledWith("https://example.com/job", {
      userId: "user-1",
    });
    expect(fetchMetadataViaPlaywright).toHaveBeenCalledWith("https://example.com/job", {
      userId: "user-1",
    });
  });

  it("logs the Playwright fallback trigger, attributed to the userId when known", async () => {
    vi.mocked(fetchMetadataViaHttp).mockResolvedValue(EMPTY);
    vi.mocked(fetchMetadataViaPlaywright).mockResolvedValue(EMPTY);

    await scrapeJobMetadata("https://example.com/job", { userId: "user-1" });

    expect(logger.info).toHaveBeenCalledWith(
      "scraper.playwright_fallback_triggered",
      expect.objectContaining({ url: "https://example.com/job", userId: "user-1" })
    );
  });

  describe("SCRAPER_PLAYWRIGHT_ENABLED kill switch (JOB-65)", () => {
    const original = process.env.SCRAPER_PLAYWRIGHT_ENABLED;

    afterEach(() => {
      if (original === undefined) delete process.env.SCRAPER_PLAYWRIGHT_ENABLED;
      else process.env.SCRAPER_PLAYWRIGHT_ENABLED = original;
    });

    it("falls back to Playwright by default (flag unset)", async () => {
      delete process.env.SCRAPER_PLAYWRIGHT_ENABLED;
      vi.mocked(fetchMetadataViaHttp).mockResolvedValue(EMPTY);
      vi.mocked(fetchMetadataViaPlaywright).mockResolvedValue(EMPTY);

      await scrapeJobMetadata("https://example.com/job");

      expect(fetchMetadataViaPlaywright).toHaveBeenCalled();
    });

    it("skips the Playwright fallback and logs why when explicitly disabled (\"0\")", async () => {
      process.env.SCRAPER_PLAYWRIGHT_ENABLED = "0";
      vi.mocked(fetchMetadataViaHttp).mockResolvedValue(EMPTY);

      const result = await scrapeJobMetadata("https://example.com/job", { userId: "user-1" });

      expect(fetchMetadataViaPlaywright).not.toHaveBeenCalled();
      expect(result).toEqual(EMPTY);
      expect(logger.info).toHaveBeenCalledWith(
        "scraper.playwright_disabled",
        expect.objectContaining({ url: "https://example.com/job", userId: "user-1" })
      );
    });
  });
});
