# Revue de sécurité — module Harvester (JOB-46)

Revue transverse du module de collecte d'offres (`lib/harvester/`, `app/actions/campaigns.ts`)
avant de continuer l'intégration backend/frontend (tickets 9+). Signée : Aymeric (porteur produit),
2026-08-19.

## Isolation multi-tenant

Chaque table introduite (`Campaign`, `HarvestedOffer`, `ConnectorRun`) porte `userId` (directement,
ou via `Campaign.userId` pour `ConnectorRun`), avec contraintes Prisma dédiées :

* `Campaign` : `@@unique([userId, slug])`, `@@unique([id, userId])` — permet le pattern
  `campaignOwnerWhere(id, userId)` déjà utilisé pour Job/Contact.
* `HarvestedOffer` : `@@unique([userId, dedupKey])` — le dédoublonnage (orchestrator.ts) ne
  traverse jamais les comptes (`findFirst`/`findMany` toujours filtrés par `userId`).
* `ConnectorRun` : pas de `userId` direct, mais toujours créé avec un `campaignId` déjà scopé —
  aucune Server Action ne l'expose indépendamment d'une campagne possédée.

Vérifié par test d'intégration contre le vrai Postgres local
(`app/actions/campaigns.isolation.integration.test.ts`) : un second utilisateur ne peut ni lister,
ni modifier, ni supprimer les campagnes d'un autre ; la suppression en cascade d'une campagne
n'affecte que les `HarvestedOffer` de son propriétaire.

## rawPayload anti-PII (ADR-0004 de job-harvester)

Vérifié pour les 4 connecteurs déjà portés (France Travail, La Bonne Alternance, Workday,
SmartRecruiters) : chaque `normalize.ts` stocke `rawPayload: parsed` où `parsed` est le résultat
d'un `.parse()` Zod qui **whiteliste** les champs conservés par construction (les schémas ne
déclarent aucun champ contact/téléphone/email). Test dédié par connecteur qui injecte un champ PII
dans le payload brut et vérifie son absence de `rawPayload` :
`francetravail/normalize.test.ts` ("never leaks a contact field"),
`labonnealternance/normalize.test.ts` ("strips recruiter PII"). Workday/SmartRecruiters n'exposent
aucun champ contact/recruteur identifié dans leurs API (vérifié en lisant leurs schémas Zod
respectifs) — pas de champ à tester en creux, cohérent avec l'addendum du ticket 5.

À reproduire pour chaque connecteur futur (tickets 19/20, hors périmètre de ce lot).

## Threat model — sortant (SSRF)

Décision actée au ticket 4 (JOB-42) : les clients connecteurs utilisent `fetch` direct (via
`fetchImpl` injectable pour les tests), pas `lib/safe-fetch.ts`. `lib/safe-fetch.ts` protège contre
un tout autre profil de risque (URL fournie par l'utilisateur ou scrapée, pouvant rediriger vers
une cible loopback/privée) qui ne s'applique pas ici : chaque domaine interrogé par un connecteur
est une constante codée en dur dans son `client.ts` (`api.francetravail.io`,
`api.apprentissage.beta.gouv.fr`, `*.myworkdayjobs.com`, `api.smartrecruiters.com`), jamais dérivée
d'une entrée utilisateur. Confirmé à nouveau ici, pas de changement.

## Rate limiting du déclenchement de collecte

**Non applicable à ce ticket** : aucune action de déclenchement n'existe encore (tickets 9/14,
JOB-47/JOB-52, à venir). Le rate limiting du déclenchement sera appliqué à ce moment-là, avec
`lib/rate-limit.ts` (`InMemorySlidingWindowRateLimiter`), le même mécanisme déjà en place pour les
autres Server Actions sensibles à l'abus — pas un nouveau mécanisme dédié. Noté ici pour
traçabilité, à vérifier au moment de la revue des tickets 9/14.

## Secrets tiers (clés API)

Politique tranchée : par utilisateur, pas globale — cohérent avec le reste de Jobboard (mono-tenant
par compte, pas de configuration partagée entre utilisateurs). Non applicable au code actuel : les
clés (`FRANCE_TRAVAIL_CLIENT_ID/_SECRET`, `LBA_API_KEY`) sont aujourd'hui lues depuis
`process.env`/`ConnectorContext.env` (variables de déploiement, donc globales à l'instance) — la
bascule vers un stockage par utilisateur, si un jour plusieurs comptes réels partagent ce
déploiement, est un changement de portée qui dépasse ce ticket et n'a pas de valeur pour un usage
personnel mono-utilisateur actuel. Décision documentée pour éviter un oubli silencieux plutôt qu'un
changement de code non demandé.

## Abus de la fonctionnalité de collecte

Sans objet pour l'instant (pas de déclenchement exposé) — cf. section rate limiting ci-dessus.

## Tier 2 — scraping générique (`jsonld-generic`, `sitemap-crawler`, JOB-58)

Contrairement aux connecteurs tier 0/1, ces deux connecteurs n'interrogent pas une API à domaine
fixe mais des pages web arbitraires configurées par l'utilisateur par campagne
(`query.targets.jsonldGeneric` / `query.targets.sitemapCrawler`) — surface de risque différente,
traitée spécifiquement :

* **Conformité robots.txt** : chaque URL est vérifiée via `lib/harvester/robots.ts`
  (`isAllowedByRobots`, `robots-parser`) avant tout `fetch` — aussi bien la page cible directe
  (`jsonld-generic`) que le sitemap lui-même et chacune des URLs qu'il liste
  (`sitemap-crawler`). Une cible refusée par robots.txt est journalée (`logger.warn`) et ignorée,
  jamais retentée. Vérifié par test pour les deux connecteurs (`client.test.ts` : "skips a target
  disallowed by robots.txt" / "skips the whole target when robots.txt disallows the sitemap
  itself" / "skips a candidate page disallowed by robots.txt").
* **Filtrage des URLs de sitemap** : `sitemap-crawler` ne suit que les URLs correspondant à un
  motif de page d'offre (`/\/jobs\/|\/careers\/|\/offre|\/recrutement/i`) — un sitemap complet
  (pages "à propos", mentions légales, contact...) n'est jamais entièrement crawlé.
* **Politesse par domaine** : `sitemap-crawler` espace ses requêtes vers un même domaine via
  `waitForDomain` (`lib/harvester/domain-politeness.ts`), en plus du rate limiting global déjà en
  place sur `fetchImpl`. `jsonld-generic` n'en a pas besoin : ses cibles sont des URLs uniques
  fournies explicitement par l'utilisateur, pas une liste découverte par crawl.
* **SSRF sur le fallback navigateur headless** : `lib/harvester/headless.ts` (`fetchRenderedHtml`,
  utilisé quand une page ne rend son JSON-LD que côté client) vérifie chaque URL — la cible
  initiale et toute requête déclenchée par la page pendant son rendu (`page.route`) — via
  `isDisallowedFetchTarget` (`lib/url.ts`), le même garde-fou anti-SSRF que `lib/safe-fetch.ts`.
  C'est une amélioration délibérée par rapport à job-harvester d'origine, qui ne comportait pas ce
  garde-fou sur son navigateur headless — pertinente ici car, contrairement aux connecteurs
  tier 0/1 à domaine codé en dur, les cibles tier 2 sont fournies par l'utilisateur (mêmes
  conditions qui justifient `safe-fetch.ts` ailleurs dans le code, cf. section SSRF ci-dessus).
* **Point de lancement Chromium unique** : `fetchRenderedHtml` réutilise `launchBrowser`, exporté
  depuis `lib/scraper/playwright-strategy.ts` — un seul point d'instanciation Playwright partagé
  avec le scraper existant, pas une seconde implémentation dupliquée.
* **rawPayload anti-PII (ADR-0004)** : `normalizeJsonLdOffer` ne stocke que le résultat du
  `.parse()` Zod (`JsonLdRawOfferSchema`), qui whiteliste les champs JSON-LD conservés — un champ
  contact/téléphone/email injecté dans le JobPosting source n'atteint jamais `rawPayload`. Vérifié
  par test dédié (`jsonld-generic/normalize.test.ts`, "never leaks a recruiter contact field").
  `sitemap-crawler` réutilise le même `normalize.ts` (réexport), donc la même garantie s'applique
  sans duplication de test.
