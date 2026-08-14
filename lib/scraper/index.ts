import { fetchMetadataViaHttp } from "@/lib/scraper/fetch-strategy";
import { fetchMetadataViaPlaywright } from "@/lib/scraper/playwright-strategy";
import type { ScrapeContext, ScrapedJobMetadata } from "@/lib/scraper/types";
import { logger } from "@/lib/logger";

export type { ScrapedJobMetadata, ScrapeContext } from "@/lib/scraper/types";

export async function scrapeJobMetadata(
  url: string,
  context?: ScrapeContext
): Promise<ScrapedJobMetadata> {
  const logFields = { url, ...(context?.userId ? { userId: context.userId } : {}) };

  const httpStart = Date.now();
  const viaHttp = await fetchMetadataViaHttp(url, context);
  const httpLatencyMs = Date.now() - httpStart;
  const httpSuccess = !!viaHttp.title;

  if (httpSuccess) {
    // Métriques minimales (JOB-114) : nb de scrapings, % réussite Cheerio
    // seul, % fallback déclenché, latence par stratégie — dérivables par
    // agrégation sur cet événement, plutôt qu'un backend de métriques dédié.
    logger.info("scraper.metrics", {
      ...logFields,
      httpSuccess,
      httpLatencyMs,
      playwrightTriggered: false,
    });
    return viaHttp;
  }

  // Kill switch (JOB-65) : désactivable sans redéploiement si le coût/la
  // latence du fallback Playwright devient problématique en production.
  // Activé par défaut ; mettre exactement "0" pour désactiver.
  if (process.env.SCRAPER_PLAYWRIGHT_ENABLED === "0") {
    logger.info("scraper.playwright_disabled", logFields);
    logger.info("scraper.metrics", {
      ...logFields,
      httpSuccess,
      httpLatencyMs,
      playwrightTriggered: false,
    });
    return viaHttp;
  }

  // Aucun titre exploitable via le fetch simple (page bloquée, ou rendue
  // côté client) : on retente avec un navigateur headless.
  logger.info("scraper.playwright_fallback_triggered", logFields);
  const playwrightStart = Date.now();
  const viaPlaywright = await fetchMetadataViaPlaywright(url, context);
  const playwrightLatencyMs = Date.now() - playwrightStart;
  logger.info("scraper.metrics", {
    ...logFields,
    httpSuccess,
    httpLatencyMs,
    playwrightTriggered: true,
    playwrightSuccess: !!viaPlaywright.title,
    playwrightLatencyMs,
  });
  return viaPlaywright;
}
