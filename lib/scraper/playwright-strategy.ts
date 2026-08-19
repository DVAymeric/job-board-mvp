import type { Browser } from "playwright-core";
import { isDisallowedFetchTarget } from "@/lib/url";
import { extractJobMetadataFromHtml } from "@/lib/scraper/html-parser";
import {
  EMPTY_SCRAPED_METADATA,
  type ScrapeContext,
  type ScrapedJobMetadata,
} from "@/lib/scraper/types";
import { logger } from "@/lib/logger";

const PLAYWRIGHT_TIMEOUT_MS = 20000;

/**
 * Architecture retenue pour Vercel serverless (JOB-64) : le Chromium
 * complet embarqué par `playwright` dépasse la limite de taille des
 * fonctions. Sur Vercel, on bascule donc sur `playwright-core` (sans
 * navigateur embarqué) + le binaire Chromium compressé fourni par
 * `@sparticuz/chromium`. En local/CI (npm run dev, tests unitaires, suite
 * e2e/scraper-fixtures.spec.ts), on garde le Chromium complet déjà
 * installé par `playwright` (node_modules/playwright, cache local).
 */
/**
 * Point d'entrée unique pour lancer un Chromium headless dans ce repo (JOB-58) — réutilisé tel
 * quel par lib/harvester/headless.ts (tier 2, scraping générique) plutôt que dupliqué avec sa
 * propre logique de lancement, pour ne garder qu'une seule branche Vercel/local à maintenir.
 */
export async function launchBrowser(): Promise<Browser> {
  if (process.env.VERCEL) {
    const [{ chromium }, { default: sparticuzChromium }] = await Promise.all([
      import("playwright-core"),
      import("@sparticuz/chromium"),
    ]);
    return chromium.launch({
      args: sparticuzChromium.args,
      executablePath: await sparticuzChromium.executablePath(),
      headless: true,
    });
  }
  const { chromium } = await import("playwright");
  return chromium.launch({ headless: true });
}

export async function fetchMetadataViaPlaywright(
  url: string,
  context?: ScrapeContext
): Promise<ScrapedJobMetadata> {
  if (isDisallowedFetchTarget(url)) {
    return EMPTY_SCRAPED_METADATA;
  }

  const logFields = { url, ...(context?.userId ? { userId: context.userId } : {}) };

  let browser: Browser | undefined;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    // Le SSRF guard de safeFetch ne s'applique qu'au fetch simple : un
    // navigateur peut suivre des redirections ou charger des sous-ressources
    // vers des cibles internes. On revalide donc chaque requête déclenchée
    // par la page (navigation initiale, redirections, sous-ressources).
    await page.route("**/*", (route) => {
      if (isDisallowedFetchTarget(route.request().url())) {
        return route.abort();
      }
      return route.continue();
    });
    await page.goto(url, {
      timeout: PLAYWRIGHT_TIMEOUT_MS,
      waitUntil: "domcontentloaded",
    });
    const html = await page.content();
    // page.url() plutôt que le paramètre url : reflète l'URL après
    // d'éventuelles redirections (le site de destination réel importe pour
    // choisir la règle de découpage titre/entreprise).
    const metadata = extractJobMetadataFromHtml(html, page.url());
    logger.info("scraper.playwright_ok", { ...logFields, titleFound: !!metadata.title });
    return metadata;
  } catch {
    logger.warn("scraper.playwright_error", logFields);
    return EMPTY_SCRAPED_METADATA;
  } finally {
    await browser?.close();
  }
}
