import { timedHealthCheck, type ConnectorHealth } from "@/lib/harvester/timed-health-check";
import type { HarvestQuery, WorkdayTarget } from "@/lib/harvester/harvest-query";
import type { ContractType } from "@/lib/harvester/normalized-offer";
import { WorkdaySearchResponseSchema, WorkdayJobDetailSchema } from "@/lib/harvester/connectors/workday/types";
import { USER_AGENT } from "@/lib/harvester/user-agent";
import { logger } from "@/lib/logger";

export const WORKDAY_CONNECTOR_ID = "workday";

export interface WorkdayClientOptions {
  fetchImpl?: typeof fetch;
}

const HEALTH_CHECK_TARGET: WorkdayTarget = { tenant: "valeo", site: "valeo_jobs", dc: "wd3" };

function cxsBaseUrl(target: WorkdayTarget): string {
  return `https://${target.tenant}.${target.dc}.myworkdayjobs.com/wday/cxs/${target.tenant}/${target.site}`;
}

function headers(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "User-Agent": USER_AGENT,
  };
}

// JOB-32 (job-harvester) : la réponse de liste Workday porte déjà `total` (vérifié en direct) —
// on boucle sur `offset` tant qu'il reste des pages, avec un plafond dur de sécurité. Un run
// live antérieur avait ramené exactement `rawCount === limit` (20/20) chez Valeo, preuve que le
// plafond mordait déjà en pratique sans qu'aucun signal ne le montre.
const LIST_PAGE_SIZE = 20;
const MAX_LIST_PAGES = 20;

// JOB-74 : l'API Workday ne recherche que par texte libre, pas par type de contrat — on dérive
// un terme par type demandé plutôt que le mot en dur "alternance" (qui excluait silencieusement
// tout Contrat=Stage). "autre"/type inconnu n'a pas de terme fiable ; ne pas filtrer plutôt que
// de forcer "alternance" (le filtre centralisé de JOB-73 affinera ensuite).
const CONTRACT_SEARCH_TERMS: Partial<Record<ContractType, string>> = {
  apprentissage: "alternance",
  professionnalisation: "alternance",
  stage: "stage",
};

function buildSearchTerms(contractTypes: ContractType[]): string[] {
  const terms = new Set<string>();
  for (const type of contractTypes) {
    const term = CONTRACT_SEARCH_TERMS[type];
    if (term) terms.add(term);
  }
  return terms.size > 0 ? [...terms] : [""];
}

async function fetchJobList(target: WorkdayTarget, searchText: string, fetchImpl: typeof fetch): Promise<unknown[]> {
  const items: unknown[] = [];
  let offset = 0;
  for (let page = 0; page < MAX_LIST_PAGES; page++) {
    const response = await fetchImpl(`${cxsBaseUrl(target)}/jobs`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ appliedFacets: {}, limit: LIST_PAGE_SIZE, offset, searchText }),
    });
    if (!response.ok) {
      throw new Error(`workday search failed: HTTP ${response.status}`);
    }
    const parsed = WorkdaySearchResponseSchema.parse(await response.json());
    items.push(...parsed.jobPostings);
    if (parsed.jobPostings.length === 0) break;
    offset += LIST_PAGE_SIZE;
    if (offset >= parsed.total) break;
    // JOB-166 : le run live qui a inspiré le plafond de JOB-32 avait ramené rawCount===limit sans
    // qu'aucun signal ne le montre — on log désormais explicitement quand la dernière page
    // autorisée est consommée alors que l'API annonce encore plus de résultats (`offset < total`).
    if (page === MAX_LIST_PAGES - 1) {
      logger.warn("harvester.workday.pagination_cap_reached", {
        tenant: target.tenant,
        site: target.site,
        searchText,
        fetched: items.length,
        total: parsed.total,
        maxListPages: MAX_LIST_PAGES,
      });
    }
  }
  return items;
}

async function fetchJobDetail(
  target: WorkdayTarget,
  externalPath: string,
  fetchImpl: typeof fetch,
): Promise<{ title: string; jobDescription: string; location?: string; jobReqId?: string; externalUrl?: string }> {
  const response = await fetchImpl(`${cxsBaseUrl(target)}${externalPath}`, { headers: headers() });
  if (!response.ok) {
    throw new Error(`workday job detail failed: HTTP ${response.status}`);
  }
  const parsed = WorkdayJobDetailSchema.parse(await response.json());
  return parsed.jobPostingInfo;
}

export async function* fetchWorkdayOffers(query: HarvestQuery, options: WorkdayClientOptions): AsyncIterable<unknown> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const targets = query.targets?.workday ?? [];
  const searchTerms = buildSearchTerms(query.contractTypes);
  for (const target of targets) {
    // JOB-169 : un tenant en échec (timeout, renommé, supprimé) ne doit pas priver la campagne
    // des offres des autres tenants ciblés dans le même run.
    try {
      const seenExternalPaths = new Set<string>();
      for (const searchText of searchTerms) {
        const listItems = await fetchJobList(target, searchText, fetchImpl);
        for (const item of listItems) {
          const listing = item as { externalPath?: string };
          if (!listing.externalPath || seenExternalPaths.has(listing.externalPath)) continue;
          seenExternalPaths.add(listing.externalPath);
          const jobPostingInfo = await fetchJobDetail(target, listing.externalPath, fetchImpl);
          yield { target, externalPath: listing.externalPath, jobPostingInfo };
        }
      }
    } catch (error) {
      logger.warn("harvester.workday.target_skipped", {
        tenant: target.tenant,
        site: target.site,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export async function checkWorkdayHealth(options: WorkdayClientOptions): Promise<ConnectorHealth> {
  const fetchImpl = options.fetchImpl ?? fetch;
  return timedHealthCheck(WORKDAY_CONNECTOR_ID, () =>
    fetchImpl(`${cxsBaseUrl(HEALTH_CHECK_TARGET)}/jobs`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ appliedFacets: {}, limit: 1, offset: 0, searchText: "" }),
    }),
  );
}
