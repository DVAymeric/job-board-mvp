import type { Browser } from "playwright-core";
import { launchBrowser } from "@/lib/scraper/playwright-strategy";
import { isDisallowedFetchTarget } from "@/lib/url";

// Dernier recours uniquement (JOB-58) : lancer un vrai navigateur est lent et coûteux, jamais la
// première tentative de fetch. Réutilise le même point d'entrée Chromium que le scraper
// existant (lib/scraper/playwright-strategy.ts) — pas de seconde implémentation du lancement
// headless (DRY strict, ticket 1).
//
// Garde SSRF ajoutée ici par rapport à l'original job-harvester (qui n'en avait aucune sur ce
// chemin) : les URLs de scraping tier2 viennent de la configuration de campagne d'un
// utilisateur, même profil de risque que les URLs scrapées ailleurs dans l'app — même garde que
// fetchMetadataViaPlaywright.
export async function fetchRenderedHtml(url: string): Promise<string> {
  if (isDisallowedFetchTarget(url)) {
    throw new Error(`fetchRenderedHtml: disallowed target ${url}`);
  }

  let browser: Browser | undefined;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.route("**/*", (route) => {
      if (isDisallowedFetchTarget(route.request().url())) {
        return route.abort();
      }
      return route.continue();
    });
    await page.goto(url, { waitUntil: "networkidle" });
    return await page.content();
  } finally {
    await browser?.close();
  }
}
