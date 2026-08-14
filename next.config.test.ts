import { describe, expect, it } from "vitest";
import nextConfig from "@/next.config";

async function getSecurityHeaders(): Promise<Record<string, string>> {
  const rules = await nextConfig.headers!();
  const rule = rules.find((r) => r.source === "/(.*)");
  const headers: Record<string, string> = {};
  for (const { key, value } of rule!.headers) {
    headers[key] = value;
  }
  return headers;
}

describe("next.config headers (JOB-117)", () => {
  it("sets a Content-Security-Policy restricting to self plus the known logo providers", async () => {
    const headers = await getSecurityHeaders();
    const csp = headers["Content-Security-Policy"];

    expect(csp).toBeDefined();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toMatch(/img-src[^;]*'self'/);
    expect(csp).toMatch(/img-src[^;]*https:\/\/logo\.clearbit\.com/);
    expect(csp).toMatch(/img-src[^;]*https:\/\/cdn\.brandfetch\.io/);
  });

  it("sets Strict-Transport-Security with a long max-age and includeSubDomains", async () => {
    const headers = await getSecurityHeaders();
    expect(headers["Strict-Transport-Security"]).toMatch(
      /max-age=\d{7,}/
    );
    expect(headers["Strict-Transport-Security"]).toContain("includeSubDomains");
  });

  it("sets X-Content-Type-Options: nosniff", async () => {
    const headers = await getSecurityHeaders();
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
  });

  it("sets X-Frame-Options: DENY", async () => {
    const headers = await getSecurityHeaders();
    expect(headers["X-Frame-Options"]).toBe("DENY");
  });

  it("sets a Referrer-Policy", async () => {
    const headers = await getSecurityHeaders();
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
  });

  it("disables the X-Powered-By header", () => {
    expect(nextConfig.poweredByHeader).toBe(false);
  });
});
