import { describe, expect, it, vi, beforeEach } from "vitest";
import { fetchMetadataViaPlaywright } from "@/lib/scraper/playwright-strategy";
import { chromium } from "playwright";

vi.mock("playwright", () => ({
  chromium: { launch: vi.fn() },
}));

const EMPTY = { title: null, companyName: null, descriptionText: null };

function makeBrowser({
  contentHtml = "",
  gotoError,
}: {
  contentHtml?: string;
  gotoError?: Error;
} = {}) {
  const route = vi.fn();
  const page = {
    route,
    goto: gotoError ? vi.fn().mockRejectedValue(gotoError) : vi.fn().mockResolvedValue(undefined),
    content: vi.fn().mockResolvedValue(contentHtml),
  };
  const close = vi.fn();
  const browser = { newPage: vi.fn().mockResolvedValue(page), close };
  return { browser, page, close };
}

describe("fetchMetadataViaPlaywright", () => {
  beforeEach(() => {
    vi.mocked(chromium.launch).mockReset();
  });

  it("parses metadata from the rendered page's HTML", async () => {
    const { browser, close } = makeBrowser({
      contentHtml: `<meta property="og:title" content="Développeur Backend" />`,
    });
    vi.mocked(chromium.launch).mockResolvedValue(browser as never);

    const result = await fetchMetadataViaPlaywright("https://example.com/job");

    expect(result.title).toBe("Développeur Backend");
    expect(close).toHaveBeenCalled();
  });

  it("returns empty metadata and still closes the browser when navigation fails", async () => {
    const { browser, close } = makeBrowser({ gotoError: new Error("timeout") });
    vi.mocked(chromium.launch).mockResolvedValue(browser as never);

    const result = await fetchMetadataViaPlaywright("https://example.com/job");

    expect(result).toEqual(EMPTY);
    expect(close).toHaveBeenCalled();
  });

  it("rejects a disallowed target upfront, without launching a browser (SSRF guard)", async () => {
    const result = await fetchMetadataViaPlaywright(
      "http://169.254.169.254/latest/meta-data"
    );

    expect(result).toEqual(EMPTY);
    expect(chromium.launch).not.toHaveBeenCalled();
  });

  it("aborts navigation/redirects to disallowed hosts once the browser is running (redirect-hop SSRF guard)", async () => {
    const { browser, page } = makeBrowser({ contentHtml: "<title>ok</title>" });
    vi.mocked(chromium.launch).mockResolvedValue(browser as never);

    await fetchMetadataViaPlaywright("https://example.com/job");

    expect(page.route).toHaveBeenCalledWith("**/*", expect.any(Function));
    const handler = page.route.mock.calls[0][1];
    const abort = vi.fn();
    const cont = vi.fn();
    handler({
      request: () => ({ url: () => "http://127.0.0.1/admin" }),
      abort,
      continue: cont,
    });
    expect(abort).toHaveBeenCalled();
    expect(cont).not.toHaveBeenCalled();
  });

  it("lets navigation continue for allowed hosts", async () => {
    const { browser, page } = makeBrowser({ contentHtml: "<title>ok</title>" });
    vi.mocked(chromium.launch).mockResolvedValue(browser as never);

    await fetchMetadataViaPlaywright("https://example.com/job");

    const handler = page.route.mock.calls[0][1];
    const abort = vi.fn();
    const cont = vi.fn();
    handler({
      request: () => ({ url: () => "https://example.com/job" }),
      abort,
      continue: cont,
    });
    expect(cont).toHaveBeenCalled();
    expect(abort).not.toHaveBeenCalled();
  });
});
