import { describe, expect, it } from "vitest";
import { isDisallowedFetchTarget, normalizeUrl } from "@/lib/url";

describe("normalizeUrl", () => {
  it("adds https protocol when missing", () => {
    expect(normalizeUrl("example.com/job")).toBe("https://example.com/job");
  });

  it("throws on empty input", () => {
    expect(() => normalizeUrl("   ")).toThrow("URL invalide");
  });

  it.each([
    "http://127.0.0.1/job",
    "http://127.0.0.1:8080/job",
    "http://10.0.0.5/job",
    "http://172.16.0.1/job",
    "http://172.31.255.255/job",
    "http://192.168.1.1/job",
    "http://169.254.169.254/latest/meta-data/",
    "http://0.0.0.0/job",
    "http://[::1]/job",
    "http://[fe80::1]/job",
    "http://[fc00::1]/job",
    "http://[::ffff:127.0.0.1]/job",
  ])("rejects the private/loopback/link-local target %s", (url) => {
    expect(() => normalizeUrl(url)).toThrow("URL invalide");
  });

  it.each(["ftp://example.com/job", "file:///etc/passwd"])(
    "rejects the non-http(s) scheme %s",
    (url) => {
      expect(() => normalizeUrl(url)).toThrow("URL invalide");
    }
  );

  it("still allows a normal public https URL", () => {
    expect(normalizeUrl("https://example.com/job/123")).toBe(
      "https://example.com/job/123"
    );
  });

  it("still allows a public IP address that isn't in a private range", () => {
    expect(normalizeUrl("http://8.8.8.8/job")).toBe("http://8.8.8.8/job");
  });
});

describe("isDisallowedFetchTarget", () => {
  it("flags an invalid URL as disallowed", () => {
    expect(isDisallowedFetchTarget("not a url")).toBe(true);
  });

  it("flags a private IPv4 target as disallowed", () => {
    expect(isDisallowedFetchTarget("http://10.1.2.3/x")).toBe(true);
  });

  it("allows a normal public target", () => {
    expect(isDisallowedFetchTarget("https://example.com/x")).toBe(false);
  });
});
