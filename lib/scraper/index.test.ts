import { describe, expect, it, vi, beforeEach } from "vitest";
import { scrapeJobMetadata } from "@/lib/scraper";
import { fetchMetadataViaHttp } from "@/lib/scraper/fetch-strategy";
import { fetchMetadataViaPlaywright } from "@/lib/scraper/playwright-strategy";

vi.mock("@/lib/scraper/fetch-strategy", () => ({
  fetchMetadataViaHttp: vi.fn(),
}));

vi.mock("@/lib/scraper/playwright-strategy", () => ({
  fetchMetadataViaPlaywright: vi.fn(),
}));

describe("scrapeJobMetadata", () => {
  beforeEach(() => {
    vi.mocked(fetchMetadataViaHttp).mockReset();
    vi.mocked(fetchMetadataViaPlaywright).mockReset();
  });

  it("returns the HTTP strategy's result directly when it finds a title", async () => {
    const metadata = {
      title: "Développeur Backend",
      companyName: "Acme",
      descriptionText: null,
    };
    vi.mocked(fetchMetadataViaHttp).mockResolvedValue(metadata);

    const result = await scrapeJobMetadata("https://example.com/job");

    expect(fetchMetadataViaHttp).toHaveBeenCalledWith("https://example.com/job");
    expect(fetchMetadataViaPlaywright).not.toHaveBeenCalled();
    expect(result).toEqual(metadata);
  });

  it("falls back to the Playwright strategy when the HTTP strategy finds no title", async () => {
    vi.mocked(fetchMetadataViaHttp).mockResolvedValue({
      title: null,
      companyName: null,
      descriptionText: null,
    });
    const playwrightResult = {
      title: "Développeur Backend",
      companyName: "Acme",
      descriptionText: null,
    };
    vi.mocked(fetchMetadataViaPlaywright).mockResolvedValue(playwrightResult);

    const result = await scrapeJobMetadata("https://example.com/job");

    expect(fetchMetadataViaPlaywright).toHaveBeenCalledWith("https://example.com/job");
    expect(result).toEqual(playwrightResult);
  });
});
