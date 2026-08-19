import { timedHealthCheck, type ConnectorHealth } from "@/lib/harvester/timed-health-check";
import type { HarvestQuery } from "@/lib/harvester/harvest-query";
import { isAllowedByRobots } from "@/lib/harvester/robots";
import { extractJobPostings } from "@/lib/harvester/jsonld";
import { fetchRenderedHtml } from "@/lib/harvester/headless";
import { USER_AGENT } from "@/lib/harvester/user-agent";
import { logger } from "@/lib/logger";

export const JSONLD_GENERIC_CONNECTOR_ID = "jsonld-generic";

export interface JsonLdGenericClientOptions {
  fetchImpl?: typeof fetch;
}

function headers(): Record<string, string> {
  return { "User-Agent": USER_AGENT };
}

async function fetchStaticHtml(url: string, fetchImpl: typeof fetch): Promise<string> {
  const response = await fetchImpl(url, { headers: headers() });
  if (!response.ok) {
    throw new Error(`jsonld-generic fetch failed: HTTP ${response.status}`);
  }
  return response.text();
}

export async function* fetchJsonLdGenericOffers(
  query: HarvestQuery,
  options: JsonLdGenericClientOptions,
): AsyncIterable<unknown> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const pageUrls = query.targets?.jsonldGeneric ?? [];

  for (const pageUrl of pageUrls) {
    const allowed = await isAllowedByRobots(pageUrl, USER_AGENT, fetchImpl);
    if (!allowed) {
      logger.warn("harvester.jsonld_generic.target_skipped", { pageUrl, reason: "disallowed_by_robots" });
      continue;
    }

    let html: string;
    try {
      html = await fetchStaticHtml(pageUrl, fetchImpl);
    } catch (error) {
      logger.warn("harvester.jsonld_generic.target_skipped", {
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

export async function checkJsonLdGenericHealth(options: JsonLdGenericClientOptions): Promise<ConnectorHealth> {
  // Pas de domaine fixe unique à sonder — les pages cibles sont configurées par campagne, pas
  // par connecteur — donc ce check confirme seulement que le connecteur est bien câblé, pas un
  // endpoint distant précis.
  void options;
  return timedHealthCheck(JSONLD_GENERIC_CONNECTOR_ID, async () => true);
}
