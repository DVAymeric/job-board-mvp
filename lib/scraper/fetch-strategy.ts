import { safeFetch } from "@/lib/safe-fetch";
import { extractJobMetadataFromHtml } from "@/lib/scraper/html-parser";
import { EMPTY_SCRAPED_METADATA, type ScrapedJobMetadata } from "@/lib/scraper/types";

const FETCH_TIMEOUT_MS = 5000;

export async function fetchMetadataViaHttp(url: string): Promise<ScrapedJobMetadata> {
  try {
    const response = await safeFetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { Accept: "text/html" },
    });
    if (!response || !response.ok) {
      return EMPTY_SCRAPED_METADATA;
    }
    const html = await response.text();
    return extractJobMetadataFromHtml(html);
  } catch {
    return EMPTY_SCRAPED_METADATA;
  }
}
