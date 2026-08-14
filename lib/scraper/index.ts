import { fetchMetadataViaHttp } from "@/lib/scraper/fetch-strategy";
import type { ScrapedJobMetadata } from "@/lib/scraper/types";

export type { ScrapedJobMetadata } from "@/lib/scraper/types";

export async function scrapeJobMetadata(url: string): Promise<ScrapedJobMetadata> {
  return fetchMetadataViaHttp(url);
}
