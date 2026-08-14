import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fetchMetadataViaPlaywright } from "@/lib/scraper/playwright-strategy";
import { chromium } from "playwright";
import { chromium as chromiumCore } from "playwright-core";
import sparticuzChromium from "@sparticuz/chromium";
import { logger } from "@/lib/logger";

vi.mock("playwright", () => ({
  chromium: { launch: vi.fn() },
}));

vi.mock("playwright-core", () => ({
  chromium: { launch: vi.fn() },
}));

vi.mock("@sparticuz/chromium", () => ({
  default: {
    args: ["--no-sandbox", "--disable-gpu"],
    executablePath: vi.fn().mockResolvedValue("/tmp/chromium/chromium"),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
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
  const originalVercel = process.env.VERCEL;

  beforeEach(() => {
    vi.mocked(chromium.launch).mockReset();
    vi.mocked(chromiumCore.launch).mockReset();
    vi.mocked(logger.info).mockReset();
    vi.mocked(logger.warn).mockReset();
    delete process.env.VERCEL;
  });

  afterEach(() => {
    if (originalVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = originalVercel;
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

  it("logs success with the userId when a title is found and a context is provided", async () => {
    const { browser } = makeBrowser({
      contentHtml: `<meta property="og:title" content="Développeur Backend" />`,
    });
    vi.mocked(chromium.launch).mockResolvedValue(browser as never);

    await fetchMetadataViaPlaywright("https://example.com/job", { userId: "user-1" });

    expect(logger.info).toHaveBeenCalledWith(
      "scraper.playwright_ok",
      expect.objectContaining({ url: "https://example.com/job", userId: "user-1" })
    );
  });

  it("logs failure with the userId when navigation throws and a context is provided", async () => {
    const { browser } = makeBrowser({ gotoError: new Error("timeout") });
    vi.mocked(chromium.launch).mockResolvedValue(browser as never);

    await fetchMetadataViaPlaywright("https://example.com/job", { userId: "user-1" });

    expect(logger.warn).toHaveBeenCalledWith(
      "scraper.playwright_error",
      expect.objectContaining({ url: "https://example.com/job", userId: "user-1" })
    );
  });

  it("omits userId from logs for anonymous callers (no context)", async () => {
    const { browser } = makeBrowser({ contentHtml: "<title>ok</title>" });
    vi.mocked(chromium.launch).mockResolvedValue(browser as never);

    await fetchMetadataViaPlaywright("https://example.com/job");

    const [, fields] = vi.mocked(logger.info).mock.calls[0];
    expect(fields).not.toHaveProperty("userId");
  });

  it("launches via the full local playwright Chromium when not running on Vercel", async () => {
    delete process.env.VERCEL;
    const { browser } = makeBrowser({ contentHtml: "<title>ok</title>" });
    vi.mocked(chromium.launch).mockResolvedValue(browser as never);

    await fetchMetadataViaPlaywright("https://example.com/job");

    expect(chromium.launch).toHaveBeenCalledWith(expect.objectContaining({ headless: true }));
    expect(chromiumCore.launch).not.toHaveBeenCalled();
  });

  it("launches via playwright-core + @sparticuz/chromium when running on Vercel (JOB-65)", async () => {
    process.env.VERCEL = "1";
    const { browser } = makeBrowser({ contentHtml: "<title>ok</title>" });
    vi.mocked(chromiumCore.launch).mockResolvedValue(browser as never);

    await fetchMetadataViaPlaywright("https://example.com/job");

    expect(chromiumCore.launch).toHaveBeenCalledWith({
      args: sparticuzChromium.args,
      executablePath: "/tmp/chromium/chromium",
      headless: true,
    });
    expect(chromium.launch).not.toHaveBeenCalled();
  });
});
