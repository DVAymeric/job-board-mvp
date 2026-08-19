# Décision — pas de serveur HTTP Hono pour le module Harvester (JOB-48)

Statut : Acté. Date : 2026-08-19.

## Contexte

Le repo `job-harvester` d'origine exposait `packages/api` : un serveur HTTP autonome (Hono +
`@hono/node-server`, proxy Vite en dev pour `packages/web`) avec 6 groupes de routes —
`routes/campaigns.ts`, `routes/events.ts`, `routes/harvest.ts` (déclenchement de collecte),
`routes/health.ts`, `routes/offers.ts`, `routes/stats.ts`. Ce serveur existait parce que
`packages/web` (React + Vite) tournait dans un processus séparé et avait besoin d'une API réseau
(donc de CORS) pour lui parler.

## Décision

Aucune trace de ce serveur n'est portée dans job-board-mvp — décision prise dès les tickets 6/9, pas
seulement actée ici a posteriori. job-board-mvp est une app Next.js App Router monolithique : le
frontend (tickets 11-13) et le backend (Server Actions) tournent dans le même processus/déploiement,
sans frontière réseau entre les deux. Chaque route Hono d'origine a un équivalent Server Action ou
lecture Prisma directe, sans jamais introduire de serveur HTTP séparé :

| Route Hono d'origine | Équivalent job-board-mvp |
|---|---|
| `routes/campaigns.ts` (CRUD) | `app/actions/campaigns.ts` (JOB-44) |
| `routes/harvest.ts` (déclenchement) | `triggerCampaignCollection` (JOB-47) |
| `routes/offers.ts` | lecture directe `prisma.harvestedOffer` depuis un Server Component (JOB-51) + `importHarvestedOffer` (JOB-47) |
| `routes/stats.ts` | lecture directe agrégée depuis un Server Component (JOB-51/50), pas de route dédiée |
| `routes/health.ts` | `Connector.healthCheck()` (déjà porté, tickets 4/5) appelé directement, pas exposé en HTTP |
| `routes/events.ts` (`application_events`) | non applicable — la table `application_events` elle-même n'a pas été portée (décision JOB-40, doublon avec `Job.status`/`StatusHistory`) |

Server Actions plutôt qu'une API HTTP élimine par construction le besoin de CORS : aucune requête
cross-origin n'existe puisqu'il n'y a qu'une seule origine.

## Conséquence si un besoin de webhook/cron externe apparaît

Signalé comme risque par ce ticket : si un déclenchement externe (webhook public, cron hors Vercel)
s'avérait nécessaire, une route HTTP minimale authentifiée par secret partagé devrait être
réintroduite pour ce seul usage — pas un serveur Hono complet. Le ticket 14 (JOB-52, scheduling)
tranche ce point : Vercel Cron appelle une route interne à l'app elle-même (`app/api/...` Next.js),
pas un service externe séparé — donc pas de réouverture de ce risque.

## Vérification

`grep -ri "hono\|@hono" package.json` ne retourne aucune dépendance : jamais ajoutée (cohérent avec
le ticket 1, JOB-39 — DRY strict, seules `ulid`/`yaml` ont été ajoutées pour ce module).
