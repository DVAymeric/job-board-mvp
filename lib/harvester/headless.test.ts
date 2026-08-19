import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchRenderedHtml } from "@/lib/harvester/headless";
import { launchBrowser } from "@/lib/scraper/playwright-strategy";
import { isDisallowedFetchTarget } from "@/lib/url";

vi.mock("@/lib/scraper/playwright-strategy", () => ({
  launchBrowser: vi.fn(),
}));

vi.mock("@/lib/url", () => ({
  isDisallowedFetchTarget: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(launchBrowser).mockReset();
  vi.mocked(isDisallowedFetchTarget).mockReset();
});

function makeBrowser(html: string) {
  const page = {
    route: vi.fn(),
    goto: vi.fn().mockResolvedValue(undefined),
    content: vi.fn().mockResolvedValue(html),
  };
  const browser = {
    newPage: vi.fn().mockResolvedValue(page),
    close: vi.fn().mockResolvedValue(undefined),
  };
  return { browser, page };
}

describe("fetchRenderedHtml", () => {
  it("throws without launching a browser when the target is disallowed (SSRF guard)", async () => {
    vi.mocked(isDisallowedFetchTarget).mockReturnValue(true);

    await expect(fetchRenderedHtml("http://169.254.169.254/latest/meta-data")).rejects.toThrow(/disallowed/);
    expect(launchBrowser).not.toHaveBeenCalled();
  });

  it("renders the page and returns its content for an allowed target", async () => {
    vi.mocked(isDisallowedFetchTarget).mockReturnValue(false);
    const { browser, page } = makeBrowser("<html>rendered</html>");
    vi.mocked(launchBrowser).mockResolvedValue(browser as never);

    const html = await fetchRenderedHtml("https://careers.example.com/jobs");

    expect(html).toBe("<html>rendered</html>");
    expect(page.goto).toHaveBeenCalledWith("https://careers.example.com/jobs", { waitUntil: "networkidle" });
    expect(browser.close).toHaveBeenCalled();
  });

  it("closes the browser even when navigation throws", async () => {
    vi.mocked(isDisallowedFetchTarget).mockReturnValue(false);
    const { browser, page } = makeBrowser("");
    page.goto.mockRejectedValue(new Error("timeout"));
    vi.mocked(launchBrowser).mockResolvedValue(browser as never);

    await expect(fetchRenderedHtml("https://careers.example.com/jobs")).rejects.toThrow("timeout");
    expect(browser.close).toHaveBeenCalled();
  });

  it("aborts sub-requests routed toward a disallowed target during rendering", async () => {
    vi.mocked(isDisallowedFetchTarget).mockImplementation((url: string) => url.includes("169.254"));
    const { browser, page } = makeBrowser("<html></html>");
    vi.mocked(launchBrowser).mockResolvedValue(browser as never);

    await fetchRenderedHtml("https://careers.example.com/jobs");

    const routeHandler = page.route.mock.calls[0]?.[1] as (route: unknown) => unknown;
    const abort = vi.fn();
    const continueFn = vi.fn();
    routeHandler({ request: () => ({ url: () => "https://169.254.169.254/latest" }), abort, continue: continueFn });
    expect(abort).toHaveBeenCalled();
    expect(continueFn).not.toHaveBeenCalled();

    routeHandler({ request: () => ({ url: () => "https://careers.example.com/style.css" }), abort, continue: continueFn });
    expect(continueFn).toHaveBeenCalled();
  });
});
