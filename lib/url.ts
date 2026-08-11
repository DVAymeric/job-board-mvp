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
