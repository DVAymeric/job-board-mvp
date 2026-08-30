import { timedHealthCheck, type ConnectorHealth } from "@/lib/harvester/timed-health-check";
import type { HarvestQuery } from "@/lib/harvester/harvest-query";
import type { ContractType } from "@/lib/harvester/normalized-offer";
import { SmartRecruitersSearchResponseSchema } from "@/lib/harvester/connectors/smartrecruiters/types";
import { USER_AGENT } from "@/lib/harvester/user-agent";

export const SMARTRECRUITERS_CONNECTOR_ID = "smartrecruiters";
const BASE_URL = "https://api.smartrecruiters.com/v1/companies";
const HEALTH_CHECK_COMPANY = "MAZARS";

export interface SmartRecruitersClientOptions {
  fetchImpl?: typeof fetch;
}

function headers(): Record<string, string> {
  return { "User-Agent": USER_AGENT };
}

// JOB-74 : l'API SmartRecruiters ne filtre pas par type de contrat côté serveur — le filtre par
// titre d'offre doit donc suivre query.contractTypes au lieu d'exclure en dur tout ce qui n'est
// pas alternance (ce qui éliminait systématiquement les offres de stage demandées).
const CONTRACT_TITLE_PATTERNS: Partial<Record<ContractType, RegExp>> = {
  apprentissage: /alternance|apprentissage|apprenti/i,
  professionnalisation: /alternance|apprentissage|apprenti|professionnalisation/i,
  stage: /stage|stagiaire/i,
};

function matchesContractTypes(text: string, contractTypes: ContractType[]): boolean {
  const patterns = contractTypes.map((type) => CONTRACT_TITLE_PATTERNS[type]).filter((pattern): pattern is RegExp => Boolean(pattern));
  if (patterns.length === 0) return true;
  return patterns.some((pattern) => pattern.test(text));
}

// JOB-32 (job-harvester) : vérifié en direct (`totalFound` réel de 188 chez MAZARS,
// `offset`/`limit` acceptés tels quels) — boucle jusqu'à couvrir `totalFound`, avec un plafond
// dur de sécurité.
const LIST_PAGE_SIZE = 50;
const MAX_LIST_PAGES = 20;

async function fetchPostingsList(company: string, fetchImpl: typeof fetch): Promise<unknown[]> {
  const items: unknown[] = [];
  let offset = 0;
  for (let page = 0; page < MAX_LIST_PAGES; page++) {
    const response = await fetchImpl(`${BASE_URL}/${company}/postings?limit=${LIST_PAGE_SIZE}&offset=${offset}`, { headers: headers() });
    if (!response.ok) {
      throw new Error(`smartrecruiters postings list failed: HTTP ${response.status}`);
    }
    const parsed = SmartRecruitersSearchResponseSchema.parse(await response.json());
    items.push(...parsed.content);
    if (parsed.content.length === 0) break;
    offset += LIST_PAGE_SIZE;
    if (parsed.totalFound !== undefined && offset >= parsed.totalFound) break;
  }
  return items;
}

async function fetchPostingDetail(company: string, id: string, fetchImpl: typeof fetch): Promise<unknown> {
  const response = await fetchImpl(`${BASE_URL}/${company}/postings/${id}`, { headers: headers() });
  if (!response.ok) {
    throw new Error(`smartrecruiters posting detail failed: HTTP ${response.status}`);
  }
  return response.json();
}

export async function* fetchSmartRecruitersOffers(
  query: HarvestQuery,
  options: SmartRecruitersClientOptions,
): AsyncIterable<unknown> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const companies = query.targets?.smartrecruiters ?? [];
  for (const company of companies) {
    const list = await fetchPostingsList(company, fetchImpl);
    for (const item of list) {
      const listing = item as { id?: string; name?: string };
      if (!listing.id || !matchesContractTypes(listing.name ?? "", query.contractTypes)) continue;
      const detail = await fetchPostingDetail(company, listing.id, fetchImpl);
      // JOB-34 (job-harvester) : `company` (le slug de l'entreprise ciblée) n'apparaît dans
      // aucun champ de la réponse de détail elle-même — sans lui, normalize.ts ne peut pas
      // reconstruire une URL de repli valide (`/v1/companies/{company}/postings/{id}`) si
      // l'API omet un jour `applyUrl`/`postingUrl`. On l'injecte donc dans le payload
      // composite, comme le connecteur workday le fait déjà avec `target`.
      yield { company, detail };
    }
  }
}

export async function checkSmartRecruitersHealth(options: SmartRecruitersClientOptions): Promise<ConnectorHealth> {
  const fetchImpl = options.fetchImpl ?? fetch;
  return timedHealthCheck(SMARTRECRUITERS_CONNECTOR_ID, () =>
    fetchImpl(`${BASE_URL}/${HEALTH_CHECK_COMPANY}/postings?limit=1`, { headers: headers() }),
  );
}
