const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

function isPrivateOrLoopbackIPv4(hostname: string): boolean {
  const match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) return false;
  const octets = match.slice(1).map(Number);
  if (octets.some((n) => n > 255)) return false;
  const [a, b] = octets;
  if (a === 127) return true; // loopback
  if (a === 10) return true; // private
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 169 && b === 254) return true; // link-local (incl. cloud metadata)
  if (a === 0) return true; // "this" network
  return false;
}

function isPrivateOrLoopbackHostname(rawHostname: string): boolean {
  const hostname = rawHostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    return true;
  }

  if (isPrivateOrLoopbackIPv4(hostname)) {
    return true;
  }

  if (hostname === "::1" || hostname === "::") {
    return true;
  }
  if (/^fe[89ab][0-9a-f]:/.test(hostname)) return true; // link-local fe80::/10
  if (/^f[cd][0-9a-f]{2}:/.test(hostname)) return true; // unique local fc00::/7

  const mapped = hostname.match(
    /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/
  );
  if (mapped) {
    return isPrivateOrLoopbackIPv4(mapped[1]);
  }

  return false;
}

/**
 * Whether a URL is unsafe to fetch server-side: non-http(s) schemes, or a
 * hostname resolving to a loopback/private/link-local address (SSRF guard).
 *
 * ALLOW_LOOPBACK_FETCH_FOR_TESTS: escape hatch for the E2E scraper fixture
 * suite (JOB-69), which serves controlled HTML fixtures from a local
 * server. Must be exactly "1" to take effect; unset/any other value keeps
 * the guard fully active. Only ever set via `playwright.config.ts`'s
 * `webServer.env` for the Playwright-spawned dev server — never set in a
 * `.env` file, never read from user/request input, never active in the
 * production build.
 */
export function isDisallowedFetchTarget(rawUrl: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return true;
  }
  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) return true;
  if (
    process.env.ALLOW_LOOPBACK_FETCH_FOR_TESTS === "1" &&
    isPrivateOrLoopbackHostname(parsed.hostname)
  ) {
    return false;
  }
  return isPrivateOrLoopbackHostname(parsed.hostname);
}

const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
  "msclkid",
  "mc_cid",
  "mc_eid",
  "ref",
  "ref_src",
  "igshid",
  "_ga",
]);

export function normalizeUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    throw new Error("URL invalide");
  }

  const withProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(withProtocol);
  } catch {
    throw new Error("URL invalide");
  }

  if (!parsed.hostname || !parsed.hostname.includes(".")) {
    throw new Error("URL invalide");
  }

  if (isDisallowedFetchTarget(parsed.toString())) {
    throw new Error("URL invalide");
  }

  parsed.hostname = parsed.hostname.toLowerCase();
  parsed.protocol = parsed.protocol.toLowerCase();
  if (
    (parsed.protocol === "http:" && parsed.port === "80") ||
    (parsed.protocol === "https:" && parsed.port === "443")
  ) {
    parsed.port = "";
  }

  if (parsed.pathname.length > 1 && parsed.pathname.endsWith("/")) {
    parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  }

  const remainingParams = Array.from(parsed.searchParams.entries()).filter(
    ([key]) => !TRACKING_PARAMS.has(key.toLowerCase())
  );
  remainingParams.sort(([a], [b]) => a.localeCompare(b));

  parsed.search = "";
  for (const [key, value] of remainingParams) {
    parsed.searchParams.append(key, value);
  }

  parsed.hash = "";

  return parsed.toString();
}
