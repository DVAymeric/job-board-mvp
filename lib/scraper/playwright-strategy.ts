import { chromium } from "playwright";
import { isDisallowedFetchTarget } from "@/lib/url";
import { extractJobMetadataFromHtml } from "@/lib/scraper/html-parser";
import { EMPTY_SCRAPED_METADATA, type ScrapedJobMetadata } from "@/lib/scraper/types";

const PLAYWRIGHT_TIMEOUT_MS = 20000;

export async function fetchMetadataViaPlaywright(url: string): Promise<ScrapedJobMetadata> {
  if (isDisallowedFetchTarget(url)) {
    return EMPTY_SCRAPED_METADATA;
  }

  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  try {
    browser = await chromium.launch({ headless: true });
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
    return extractJobMetadataFromHtml(html);
  } catch {
    return EMPTY_SCRAPED_METADATA;
  } finally {
    await browser?.close();
  }
}
