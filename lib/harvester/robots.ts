import robotsParserImport from "robots-parser";

// robots-parser's own index.d.ts starts with a stray `declare module 'robots-parser';` shorthand
// ambient declaration, which makes the default import's inferred type an uncallable module
// namespace instead of the parser function it actually is at runtime (verified: index.js does
// `module.exports = function (url, contents) { ... }`). Re-typing the import through `unknown`
// works around that broken declaration file rather than fighting it.
interface Robots {
  isAllowed(url: string, ua?: string): boolean | undefined;
}
const robotsParser = robotsParserImport as unknown as (url: string, robotsTxt: string) => Robots;

const robotsCache = new Map<string, Robots>();

async function getRobots(origin: string, fetchImpl: typeof fetch): Promise<Robots> {
  const cached = robotsCache.get(origin);
  if (cached) return cached;

  const robotsUrl = `${origin}/robots.txt`;
  let body = "";
  try {
    const response = await fetchImpl(robotsUrl);
    if (response.ok) {
      body = await response.text();
    }
  } catch {
    // Network failure fetching robots.txt: treat as absent (allow by default), same as a 404.
  }

  const robots = robotsParser(robotsUrl, body);
  robotsCache.set(origin, robots);
  return robots;
}

// JOB-176 : politique formalisée après audit — appelée aujourd'hui uniquement par le connecteur
// talentsoft (connectors/talentsoft/client.ts, discovery/probe-talentsoft.ts). Ce n'est pas un
// oubli sur les 6 autres connecteurs : chacun d'eux interroge un host d'API vendeur partagé
// (api.smartrecruiters.com, api.digitalrecruiters.com, *.myworkdayjobs.com/wday/cxs/...,
// api.francetravail.io, api.apprentissage.beta.gouv.fr, l'index Algolia de Welcome to the
// Jungle) — jamais le domaine web propre d'une entreprise ciblée. TalentSoft est structurellement
// le seul à fetcher un domaine tiers arbitraire (page d'accueil pour la détection de plateforme,
// flux RSS) : la règle est "robots.txt vérifié pour toute source qui scrape le domaine web propre
// d'une cible, jamais pour un host d'API vendeur". `lib/scraper/` (recherche d'offre par URL
// collée par l'utilisateur) scrape lui aussi un domaine arbitraire mais dans un tout autre
// contexte — une action ponctuelle initiée par un humain sur UNE page qu'il a lui-même choisie,
// pas une collecte automatisée en volume — le robots-exclusion-protocol vise les crawlers
// automatisés, pas cet usage-là ; volontairement laissé hors du périmètre de cette fonction.
export async function isAllowedByRobots(url: string, userAgent: string, fetchImpl: typeof fetch): Promise<boolean> {
  const origin = new URL(url).origin;
  const robots = await getRobots(origin, fetchImpl);
  return robots.isAllowed(url, userAgent) ?? true;
}
