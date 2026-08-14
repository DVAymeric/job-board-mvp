import { fetchMetadataViaHttp } from "@/lib/scraper/fetch-strategy";
import { fetchMetadataViaPlaywright } from "@/lib/scraper/playwright-strategy";
import type { ScrapeContext, ScrapedJobMetadata } from "@/lib/scraper/types";
import { logger } from "@/lib/logger";

export type { ScrapedJobMetadata, ScrapeContext } from "@/lib/scraper/types";

export async function scrapeJobMetadata(
  url: string,
  context?: ScrapeContext
): Promise<ScrapedJobMetadata> {
  const viaHttp = await fetchMetadataViaHttp(url, context);
  if (viaHttp.title) {
    return viaHttp;
  }
  // Aucun titre exploitable via le fetch simple (page bloquée, ou rendue
  // côté client) : on retente avec un navigateur headless.
  logger.info("scraper.playwright_fallback_triggered", {
    url,
    ...(context?.userId ? { userId: context.userId } : {}),
  });
  return fetchMetadataViaPlaywright(url, context);
}
