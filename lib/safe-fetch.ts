import { isDisallowedFetchTarget } from "@/lib/url";

const MAX_REDIRECTS = 5;

/**
 * fetch() wrapper that blocks requests (including redirect hops) to
 * loopback/private/link-local targets — mitigates SSRF via a scraped URL
 * that 3xx-redirects to an internal address after passing initial validation.
 */
export async function safeFetch(
  url: string,
  init: RequestInit = {}
): Promise<Response | null> {
  let currentUrl = url;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (isDisallowedFetchTarget(currentUrl)) {
      return null;
    }

    const response = await fetch(currentUrl, { ...init, redirect: "manual" });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) return null;
      try {
        currentUrl = new URL(location, currentUrl).toString();
      } catch {
        return null;
      }
      continue;
    }

    return response;
  }

  return null;
}
