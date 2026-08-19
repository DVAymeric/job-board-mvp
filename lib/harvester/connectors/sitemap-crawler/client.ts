import { timedHealthCheck, type ConnectorHealth } from "@/lib/harvester/timed-health-check";
import type { HarvestQuery } from "@/lib/harvester/harvest-query";
import { isAllowedByRobots } from "@/lib/harvester/robots";
import { extractJobPostings } from "@/lib/harvester/jsonld";
import { fetchRenderedHtml } from "@/lib/harvester/headless";
import { waitForDomain } from "@/lib/harvester/domain-politeness";
import { USER_AGENT } from "@/lib/harvester/user-agent";
import { logger } from "@/lib/logger";

export const SITEMAP_CRAWLER_CONNECTOR_ID = "sitemap-crawler";

export interface SitemapCrawlerClientOptions {
  fetchImpl?: typeof fetch;
}

function headers(): Record<string, string> {
  return { "User-Agent": USER_AGENT };
}

function resolveSitemapUrl(entry: string): string {
  return entry.toLowerCase().endsWith(".xml") ? entry : `${entry.replace(/\/$/, "")}/sitemap.xml`;
}

const RELEVANT_PATH_PATTERN = /\/jobs\/|\/careers\/|\/offre|\/recrutement/i;

function extractLocs(sitemapXml: string): string[] {
  return Array.from(sitemapXml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi), (match) => match[1]!);
}

async function fetchText(url: string, fetchImpl: typeof fetch): Promise<string> {
  const response = await fetchImpl(url, { headers: headers() });
  if (!response.ok) {
    throw new Error(`sitemap-crawler fetch failed: HTTP ${response.status}`);
  }
  return response.text();
}

export async function* fetchSitemapCrawlerOffers(
  query: HarvestQuery,
  options: SitemapCrawlerClientOptions,
): AsyncIterable<unknown> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const entries = query.targets?.sitemapCrawler ?? [];

  for (const entry of entries) {
    const sitemapUrl = resolveSitemapUrl(entry);

    const sitemapAllowed = await isAllowedByRobots(sitemapUrl, USER_AGENT, fetchImpl);
    if (!sitemapAllowed) {
      logger.warn("harvester.sitemap_crawler.target_skipped", { sitemapUrl, reason: "disallowed_by_robots" });
      continue;
    }

    let sitemapXml: string;
    try {
      sitemapXml = await fetchText(sitemapUrl, fetchImpl);
    } catch (error) {
      logger.warn("harvester.sitemap_crawler.target_skipped", {
        sitemapUrl,
        reason: "fetch_error",
        error: error instanceof Error ? error.message : String(error),
      });
      continue;
    }

    const candidateUrls = extractLocs(sitemapXml).filter((url) => RELEVANT_PATH_PATTERN.test(url));

    for (const pageUrl of candidateUrls) {
      const pageAllowed = await isAllowedByRobots(pageUrl, USER_AGENT, fetchImpl);
      if (!pageAllowed) {
        logger.warn("harvester.sitemap_crawler.page_skipped", { pageUrl, reason: "disallowed_by_robots" });
        continue;
      }

      await waitForDomain(pageUrl);

      let html: string;
      try {
        html = await fetchText(pageUrl, fetchImpl);
      } catch (error) {
        logger.warn("harvester.sitemap_crawler.page_skipped", {
          pageUrl,
          reason: "fetch_error",
          error: error instanceof Error ? error.message : String(error),
        });
        continue;
      }

      let jobPostings = extractJobPostings(html);
      if (jobPostings.length === 0) {
        // Dernier recours : certaines pages carrière ne rendent leur JSON-LD que côté client, via JS.
        const rendered = await fetchRenderedHtml(pageUrl);
        jobPostings = extractJobPostings(rendered);
      }
      if (jobPostings.length === 0) continue;

      for (const jobPosting of jobPostings) {
        yield { pageUrl, jobPosting };
      }
    }
  }
}

export async function checkSitemapCrawlerHealth(options: SitemapCrawlerClientOptions): Promise<ConnectorHealth> {
  // Pas de domaine fixe unique à sonder — les sitemaps cibles sont configurés par campagne, pas
  // par connecteur — donc ce check confirme seulement que le connecteur est bien câblé, pas un
  // endpoint distant précis.
  void options;
  return timedHealthCheck(SITEMAP_CRAWLER_CONNECTOR_ID, async () => true);
}
