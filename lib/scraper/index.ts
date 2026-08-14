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

  const logFields = { url, ...(context?.userId ? { userId: context.userId } : {}) };

  // Kill switch (JOB-65) : désactivable sans redéploiement si le coût/la
  // latence du fallback Playwright devient problématique en production.
  // Activé par défaut ; mettre exactement "0" pour désactiver.
  if (process.env.SCRAPER_PLAYWRIGHT_ENABLED === "0") {
    logger.info("scraper.playwright_disabled", logFields);
    return viaHttp;
  }

  // Aucun titre exploitable via le fetch simple (page bloquée, ou rendue
  // côté client) : on retente avec un navigateur headless.
  logger.info("scraper.playwright_fallback_triggered", logFields);
  return fetchMetadataViaPlaywright(url, context);
}
