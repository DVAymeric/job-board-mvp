import { describe, expect, it, vi, beforeEach } from "vitest";
import { scrapeJobMetadata } from "@/lib/scraper";
import { fetchMetadataViaHttp } from "@/lib/scraper/fetch-strategy";

vi.mock("@/lib/scraper/fetch-strategy", () => ({
  fetchMetadataViaHttp: vi.fn(),
}));

describe("scrapeJobMetadata", () => {
  beforeEach(() => {
    vi.mocked(fetchMetadataViaHttp).mockReset();
  });

  it("delegates to the HTTP fetch strategy and returns its result", async () => {
    const metadata = {
      title: "Développeur Backend",
      companyName: "Acme",
      descriptionText: null,
    };
    vi.mocked(fetchMetadataViaHttp).mockResolvedValue(metadata);

    const result = await scrapeJobMetadata("https://example.com/job");

    expect(fetchMetadataViaHttp).toHaveBeenCalledWith("https://example.com/job");
    expect(result).toEqual(metadata);
  });
});
