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
