import { afterEach, describe, expect, it, vi } from "vitest";
import { safeFetch } from "@/lib/safe-fetch";

describe("safeFetch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the response for a normal 200 target", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await safeFetch("https://example.com/job");

    expect(response?.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/job",
      expect.objectContaining({ redirect: "manual" })
    );
  });

  it("follows an allowed redirect chain to its final response", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: { location: "https://example.com/final" },
        })
      )
      .mockResolvedValueOnce(new Response("final", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await safeFetch("https://example.com/start");

    expect(response?.status).toBe(200);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://example.com/final",
      expect.objectContaining({ redirect: "manual" })
    );
  });

  it("returns null when a redirect points at a private/loopback target", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: { location: "http://169.254.169.254/latest/meta-data/" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await safeFetch("https://example.com/start");

    expect(response).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns null immediately when the initial target is disallowed", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await safeFetch("http://127.0.0.1/x");

    expect(response).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns null after exceeding the maximum number of redirects", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { location: "https://example.com/loop" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await safeFetch("https://example.com/loop");

    expect(response).toBeNull();
    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(6);
  });

  it("returns null when a redirect has no Location header", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 302 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await safeFetch("https://example.com/start");

    expect(response).toBeNull();
  });

  it("forwards init options (headers, signal) to the underlying fetch", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();

    await safeFetch("https://example.com/job", {
      headers: { Accept: "text/html" },
      signal: controller.signal,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/job",
      expect.objectContaining({
        headers: { Accept: "text/html" },
        signal: controller.signal,
        redirect: "manual",
      })
    );
  });
});
