import { timedHealthCheck, type ConnectorHealth } from "@/lib/harvester/timed-health-check";
import type { HarvestQuery } from "@/lib/harvester/harvest-query";
import { isAllowedByRobots } from "@/lib/harvester/robots";
import { USER_AGENT } from "@/lib/harvester/user-agent";
import { logger } from "@/lib/logger";
import type { TalentsoftRssItem } from "@/lib/harvester/connectors/talentsoft/types";

export const TALENTSOFT_CONNECTOR_ID = "talentsoft";
// JOB-31 (job-harvester) : vérifié en direct sur `recrutement.mgen.fr` — instance Talentsoft
// réelle confirmée.
const HEALTH_CHECK_DOMAIN = "recrutement.mgen.fr";

export interface TalentsoftClientOptions {
  fetchImpl?: typeof fetch;
}

function headers(): Record<string, string> {
  return { "User-Agent": USER_AGENT };
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function extractTag(itemXml: string, tag: string): string | undefined {
  const match = itemXml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return match?.[1] !== undefined ? decodeXmlEntities(match[1].trim()) : undefined;
}

function extractAllTags(itemXml: string, tag: string): string[] {
  const matches = itemXml.matchAll(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "g"));
  return Array.from(matches, (m) => decodeXmlEntities((m[1] ?? "").trim()));
}

// JOB-31 (job-harvester) : vérifié en direct — format RSS standard du handler générique
// Talentsoft (`/handlers/offerRss.ashx`), pas besoin d'une lib XML complète pour ce format
// simple. N'extrait que link/title/description/category par construction — un champ XML non
// listé ici ne peut jamais atteindre rawPayload (ADR-0004, anti-PII).
function parseRssItems(xml: string): TalentsoftRssItem[] {
  const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  return itemBlocks.map((block) => ({
    link: extractTag(block, "link") ?? "",
    title: extractTag(block, "title") ?? "",
    description: extractTag(block, "description") ?? "",
    categories: extractAllTags(block, "category"),
  }));
}

// JOB-31 (job-harvester) : vérifié en direct — une instance Talentsoft réelle
// (`recrutement.mgen.fr`) contient `__VIEWSTATE`, des liens `.aspx` et la chaîne `talentsoft` sur
// sa page d'accueil ; un domaine hors Talentsoft (faux positif signalé dans le ticket d'origine)
// n'aura aucun de ces marqueurs et doit être ignoré proprement plutôt que d'appeler un handler
// RSS qui n'existe pas sur ce domaine.
function looksLikeTalentsoft(html: string): boolean {
  return /__VIEWSTATE|talentsoft/i.test(html);
}

async function detectTalentsoftPlatform(domain: string, fetchImpl: typeof fetch): Promise<boolean> {
  const rootUrl = `https://${domain}/`;
  const allowed = await isAllowedByRobots(rootUrl, USER_AGENT, fetchImpl);
  if (!allowed) {
    logger.warn("harvester.talentsoft.target_skipped", { domain, reason: "disallowed_by_robots" });
    return false;
  }
  try {
    const response = await fetchImpl(rootUrl, { headers: headers() });
    if (!response.ok) {
      logger.warn("harvester.talentsoft.target_skipped", { domain, reason: "platform_detection_http_error", status: response.status });
      return false;
    }
    const html = await response.text();
    if (!looksLikeTalentsoft(html)) {
      logger.warn("harvester.talentsoft.target_skipped", { domain, reason: "no_talentsoft_markers" });
      return false;
    }
    return true;
  } catch (error) {
    logger.warn("harvester.talentsoft.target_skipped", {
      domain,
      reason: "platform_detection_error",
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

async function fetchRssItems(domain: string, fetchImpl: typeof fetch): Promise<TalentsoftRssItem[]> {
  const rssUrl = `https://${domain}/handlers/offerRss.ashx?LCID=1036`;
  const allowed = await isAllowedByRobots(rssUrl, USER_AGENT, fetchImpl);
  if (!allowed) {
    logger.warn("harvester.talentsoft.target_skipped", { domain, reason: "rss_disallowed_by_robots" });
    return [];
  }
  const response = await fetchImpl(rssUrl, { headers: headers() });
  if (!response.ok) {
    throw new Error(`talentsoft RSS feed failed: HTTP ${response.status}`);
  }
  const xml = await response.text();
  return parseRssItems(xml);
}

export async function* fetchTalentsoftOffers(
  query: HarvestQuery,
  options: TalentsoftClientOptions,
): AsyncIterable<unknown> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const domains = query.targets?.talentsoft ?? [];

  for (const domain of domains) {
    const isTalentsoft = await detectTalentsoftPlatform(domain, fetchImpl);
    if (!isTalentsoft) continue;

    let items: TalentsoftRssItem[];
    try {
      items = await fetchRssItems(domain, fetchImpl);
    } catch (error) {
      logger.warn("harvester.talentsoft.target_skipped", {
        domain,
        reason: "rss_fetch_error",
        error: error instanceof Error ? error.message : String(error),
      });
      continue;
    }

    for (const item of items) {
      yield { domain, item };
    }
  }
}

export async function checkTalentsoftHealth(options: TalentsoftClientOptions): Promise<ConnectorHealth> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const rssUrl = `https://${HEALTH_CHECK_DOMAIN}/handlers/offerRss.ashx?LCID=1036`;
  return timedHealthCheck(TALENTSOFT_CONNECTOR_ID, () => fetchImpl(rssUrl, { headers: headers() }));
}
