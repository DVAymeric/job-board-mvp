import { safeFetch } from "@/lib/safe-fetch";
import { extractJobMetadataFromHtml } from "@/lib/scraper/html-parser";
import {
  EMPTY_SCRAPED_METADATA,
  type ScrapeContext,
  type ScrapedJobMetadata,
} from "@/lib/scraper/types";
import { logger } from "@/lib/logger";

const FETCH_TIMEOUT_MS = 5000;

// Aligné sur un Chrome desktop courant : de nombreux sites d'offres
// bloquent les requêtes sans User-Agent ou avec un Accept-Language absent.
const REQUEST_HEADERS = {
  Accept: "text/html",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
};

// Statuts couramment renvoyés par les protections anti-bot (Cloudflare,
// rate limiting, mur d'auth) plutôt que par une absence de page/contenu.
const ANTI_BOT_STATUS_CODES = new Set([401, 403, 429, 503]);

export async function fetchMetadataViaHttp(
  url: string,
  context?: ScrapeContext
): Promise<ScrapedJobMetadata> {
  try {
    const response = await safeFetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: REQUEST_HEADERS,
    });
    if (!response || !response.ok) {
      if (response) {
        logger.warn("scraper.fetch_not_ok", {
          url,
          status: response.status,
          likelyAntiBotBlock: ANTI_BOT_STATUS_CODES.has(response.status),
          ...(context?.userId ? { userId: context.userId } : {}),
        });
      }
      return EMPTY_SCRAPED_METADATA;
    }
    const html = await response.text();
    const metadata = extractJobMetadataFromHtml(html);
    const logFields = {
      url,
      status: response.status,
      ...(context?.userId ? { userId: context.userId } : {}),
    };
    if (metadata.title) {
      // Sert de base au taux de succès Cheerio-seul vs fallback Playwright
      // (JOB-65) : compter scraper.fetch_ok vs scraper.playwright_fallback_triggered.
      logger.info("scraper.fetch_ok", logFields);
    } else {
      logger.info("scraper.no_title_found", logFields);
    }
    return metadata;
  } catch {
    return EMPTY_SCRAPED_METADATA;
  }
}
