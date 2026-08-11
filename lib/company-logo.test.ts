import { describe, expect, it } from "vitest";
import {
  buildBrandfetchLogoUrl,
  buildClearbitLogoUrl,
  extractCompanyDomain,
} from "@/lib/company-logo";

describe("extractCompanyDomain", () => {
  it("extracts the bare hostname from a job url", () => {
    expect(extractCompanyDomain("https://www.acme.com/careers/42")).toBe(
      "acme.com"
    );
  });

  it("strips the www. prefix", () => {
    expect(extractCompanyDomain("https://www.example.co.uk/jobs")).toBe(
      "example.co.uk"
    );
  });

  it("returns null for an unparsable url", () => {
    expect(extractCompanyDomain("not a url")).toBeNull();
  });
});

describe("buildClearbitLogoUrl", () => {
  it("builds the Clearbit logo endpoint for a domain", () => {
    expect(buildClearbitLogoUrl("acme.com")).toBe(
      "https://logo.clearbit.com/acme.com?size=128"
    );
  });
});

describe("buildBrandfetchLogoUrl", () => {
  it("builds the Brandfetch CDN logo link for a domain and client id", () => {
    expect(buildBrandfetchLogoUrl("acme.com", "abc123")).toBe(
      "https://cdn.brandfetch.io/acme.com/logo?c=abc123"
    );
  });
});
