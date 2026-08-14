import { describe, expect, it, vi, afterEach } from "vitest";
import { logger } from "@/lib/logger";

describe("logger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs info entries as structured JSON via console.log", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    logger.info("scraper.no_title_found", { url: "https://example.com", status: 200 });

    expect(spy).toHaveBeenCalledTimes(1);
    const entry = JSON.parse(spy.mock.calls[0][0] as string);
    expect(entry).toMatchObject({
      level: "info",
      message: "scraper.no_title_found",
      url: "https://example.com",
      status: 200,
    });
    expect(typeof entry.timestamp).toBe("string");
  });

  it("logs warnings via console.warn", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});

    logger.warn("scraper.fetch_not_ok", { status: 403 });

    expect(spy).toHaveBeenCalledTimes(1);
    const entry = JSON.parse(spy.mock.calls[0][0] as string);
    expect(entry).toMatchObject({ level: "warn", message: "scraper.fetch_not_ok", status: 403 });
  });

  it("logs errors via console.error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    logger.error("scraper.fetch_error", { url: "https://example.com" });

    expect(spy).toHaveBeenCalledTimes(1);
    const entry = JSON.parse(spy.mock.calls[0][0] as string);
    expect(entry).toMatchObject({ level: "error", message: "scraper.fetch_error" });
  });

  it("omits extra fields when none are provided", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    logger.info("noop");

    const entry = JSON.parse(spy.mock.calls[0][0] as string);
    expect(entry).toEqual({
      level: "info",
      message: "noop",
      timestamp: entry.timestamp,
    });
  });
});
