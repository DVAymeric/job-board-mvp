import { fetchMetadataViaHttp } from "@/lib/scraper/fetch-strategy";
import { fetchMetadataViaPlaywright } from "@/lib/scraper/playwright-strategy";
import type { ScrapedJobMetadata } from "@/lib/scraper/types";

export type { ScrapedJobMetadata } from "@/lib/scraper/types";

export async function scrapeJobMetadata(url: string): Promise<ScrapedJobMetadata> {
  const viaHttp = await fetchMetadataViaHttp(url);
  if (viaHttp.title) {
    return viaHttp;
  }
  // Aucun titre exploitable via le fetch simple (page bloquée, ou rendue
  // côté client) : on retente avec un navigateur headless.
  return fetchMetadataViaPlaywright(url);
}
