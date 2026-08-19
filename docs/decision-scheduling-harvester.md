# Décision — déclenchement planifié de la collecte (JOB-52)

Statut : Acté. Date : 2026-08-19.

## Contexte

Le repo `job-harvester` d'origine avait initialement été audité comme "jamais exécuté
automatiquement" (aucun scheduler visible), hypothèse infirmée par une re-vérification
ultérieure : `packages/harvester/src/scheduler.ts` (lib `croner`, vérifié en local) démarre
réellement au boot de l'API si `ENABLE_SCHEDULER=true`, et déclenche chaque campagne selon son
propre champ `schedule` (une expression cron par campagne). Ce ticket porte cette fonctionnalité
réelle vers un déclenchement planifié compatible avec un déploiement serverless (Vercel), qui ne
peut pas garder un process `croner` vivant en continu comme le faisait le serveur Node autonome
d'origine.

## Décision

**Déclenchement manuel** : `triggerCampaignCollection` (Server Action, JOB-47) — bouton "Lancer
la collecte" sur chaque campagne dans `/harvester/campaigns`, opérationnel de bout en bout,
rate-limité (5/60s, JOB-46).

**Déclenchement planifié** : `app/api/cron/harvest/route.ts`, appelée par Vercel Cron sur l'unique
horaire déclaré dans `vercel.json` (`0 7 * * *`, quotidien — reprend l'horaire déjà utilisé par
toutes les campagnes de l'exemple `campaigns.yaml` d'origine). Authentifiée par le header
`Authorization: Bearer $CRON_SECRET` que Vercel ajoute automatiquement à ses propres requêtes cron
(à configurer côté projet Vercel, cf. `.env.example`).

### Simplification actée : une cadence globale, pas une par campagne

Le scheduler `croner` d'origine respectait le champ `schedule` de chaque campagne individuellement
(un process qui reste en vie, capable d'attendre l'horaire exact de chacune). Un cron Vercel est
au contraire déclenché *par la plateforme* sur un horaire fixe déclaré à l'avance — il n'y a pas de
process persistant côté job-board-mvp pour réévaluer en continu une expression cron par campagne.

Reproduire fidèlement un horaire par campagne demanderait un parseur d'expressions cron (aucune
dépendance de ce type dans le repo à ce jour) uniquement pour comparer l'heure courante à un champ
texte libre. Décision : la route cron exécute **toutes** les campagnes dont le champ `schedule`
est non nul, à la cadence unique de `vercel.json` — le contenu exact de `schedule` par campagne
n'est donc plus interprété au runtime (il reste stocké, informatif, et continue de servir de
signal "collecte automatique activée pour cette campagne" côté formulaire). Cohérent avec le DRY
strict acté au ticket 1 (JOB-39) : pas de nouvelle dépendance pour un besoin qu'une cadence
quotidienne partagée couvre très largement, à l'échelle d'un outil personnel.

Si un besoin réel de cadences différenciées par campagne apparaît, ce choix est le premier point à
revisiter (ajouter `cron-parser` ou équivalent, ou plusieurs entrées `vercel.json` avec un
paramètre de query distinguant des groupes de campagnes).

## Vérification

Déclenchement manuel testé de bout en bout dans le navigateur (voir JOB-47/JOB-51). Déclenchement
planifié testé unitairement (`app/api/cron/harvest/route.test.ts` : 401 sans secret valide, exécute
toutes les campagnes planifiées, isole les échecs par campagne) — non testé en préproduction réelle
(pas d'environnement Vercel Preview provisionné à ce stade de la fusion).
