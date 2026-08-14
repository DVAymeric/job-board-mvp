import { safeFetch } from "@/lib/safe-fetch";
import { extractJobMetadataFromHtml } from "@/lib/scraper/html-parser";
import { EMPTY_SCRAPED_METADATA, type ScrapedJobMetadata } from "@/lib/scraper/types";

const FETCH_TIMEOUT_MS = 5000;

// Aligné sur un Chrome desktop courant : de nombreux sites d'offres
// bloquent les requêtes sans User-Agent ou avec un Accept-Language absent.
const REQUEST_HEADERS = {
  Accept: "text/html",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
};

export async function fetchMetadataViaHttp(url: string): Promise<ScrapedJobMetadata> {
  try {
    const response = await safeFetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: REQUEST_HEADERS,
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
