# Runbook de déploiement et de rollback

Document court, écrit en amont du premier déploiement réel (le déploiement
Vercel — [JOB-111](https://linear.app/jobs-boards/issue/JOB-111) — n'est pas
encore fait au moment de la rédaction) : décrit la procédure prévue, basée
sur ce qui existe déjà (pipeline CI, script de build, historique de
migrations Prisma).

## Déployer

1. Le pipeline CI (`.github/workflows/ci.yml`) doit être vert sur la PR :
   `check-dev-artifacts`, `secret-scan`, `test` (lint, typecheck, tests
   unitaires + couverture ≥70%, `npm audit`), `e2e` (Playwright contre un
   build de production).
2. Merge sur `main`.
3. Une fois Vercel connecté au repo (JOB-111) : chaque push sur `main`
   déclenche un déploiement production automatique ; chaque PR obtient une
   URL preview. `npm run build` (`prisma migrate deploy && next build`)
   s'exécute côté Vercel — les migrations Prisma en attente s'appliquent
   donc automatiquement à chaque déploiement, avant le build de l'app.
4. Variables d'environnement (`DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`,
   etc. — voir `.env.example`) : à configurer dans Vercel par environnement
   (Preview / Production), jamais commitées.
5. Module Harvester (JOB-52/JOB-54) : `vercel.json` déclare un cron
   quotidien (`/api/cron/harvest`, `0 7 * * *`) — Vercel le détecte
   automatiquement au déploiement, mais la route répond 401 tant que
   `CRON_SECRET` n'est pas configuré côté projet Vercel (voir
   `docs/gestion-des-secrets.md`). Ses migrations (3 nouvelles tables,
   1 colonne ajoutée) s'appliquent avec le reste via `prisma migrate
   deploy` à l'étape 3, sans étape manuelle supplémentaire. Les clés des
   connecteurs (`FRANCE_TRAVAIL_CLIENT_ID`/`_SECRET`, `LBA_API_KEY`,
   `WTTJ_ALGOLIA_APP_ID`/`_API_KEY`) sont toutes optionnelles au
   déploiement — chaque connecteur absent reste simplement inactif,
   aucune ne bloque le build ou le démarrage de l'app.

## Rollback d'un déploiement cassé

Le code applicatif et le schéma de base ne se « rollback » pas de la même
façon — traiter les deux séparément.

**Code applicatif :**

- Depuis le dashboard Vercel, « Promote to Production » sur le déploiement
  précédent — instantané, ne re-exécute pas `prisma migrate deploy`.
- Ou `git revert` du commit fautif puis push sur `main`, pour repartir d'un
  état propre et versionné plutôt que d'un déploiement figé hors Git.

**Schéma de base :**

`prisma migrate deploy` n'applique que les migrations manquantes ; il n'y a
pas de rollback automatique.

- Si la migration en cause est purement additive (nouvelle colonne/table
  avec valeur par défaut) et que le code reverté fonctionne dessus sans
  erreur : rien à faire, la laisser en place.
- Sinon, écrire une migration corrective qui annule le changement
  problématique (`prisma migrate dev --create-only` en local contre une
  copie de la base, ou SQL manuel), la committer et la déployer comme
  n'importe quelle migration — Prisma ne génère pas de down-migration
  automatique.

Pour limiter ce risque en amont : préférer des migrations additives et
rétrocompatibles (une ancienne version du code doit pouvoir tourner sur le
nouveau schéma) plutôt que des migrations destructrices (suppression de
colonne) déployées dans le même push que le code qui en dépend.

## Vérifier après un rollback

- `npx prisma migrate status` (contre le `DATABASE_URL` de l'environnement
  concerné) confirme l'état des migrations réellement appliquées.
- Rejouer la suite E2E (`npm run test:e2e`, avec `PLAYWRIGHT_BASE_URL`
  pointant vers l'environnement) pour confirmer que le parcours critique
  fonctionne après rollback.
