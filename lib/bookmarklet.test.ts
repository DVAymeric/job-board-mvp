import { describe, expect, it } from "vitest";
import { buildBookmarkletHref } from "@/lib/bookmarklet";

describe("buildBookmarkletHref", () => {
  it("starts with the javascript: scheme", () => {
    expect(buildBookmarkletHref("https://job-board.example.com")).toMatch(
      /^javascript:/
    );
  });

  it("embeds the given origin", () => {
    expect(buildBookmarkletHref("https://job-board.example.com")).toContain(
      "https://job-board.example.com"
    );
  });

  it("opens a new tab pointed at the app with the current page url and title", () => {
    const href = buildBookmarkletHref("https://job-board.example.com");
    expect(href).toContain("window.open(");
    expect(href).toContain("window.location.href");
    expect(href).toContain("document.title");
  });

  it("produces a single-line script (no literal newlines)", () => {
    const href = buildBookmarkletHref("https://job-board.example.com");
    expect(href).not.toMatch(/\n/);
  });

  it("is a self-invoking function", () => {
    const href = buildBookmarkletHref("https://job-board.example.com");
    expect(href).toMatch(/^javascript:\(function\(\)\{.*\}\)\(\);$/);
  });
});
