# Suivi de candidatures

Suivi de candidatures d'emploi en Kanban : colle une URL d'offre, l'app détecte automatiquement si tu l'as déjà vue ou crée la candidature (titre, entreprise et logo récupérés automatiquement). Board avec drag & drop, analytics (funnel de conversion, heatmap de fréquence), tags, contacts, notes, export CSV, collecte automatisée d'offres (Harvester).

Compte gratuit requis (email + mot de passe) — les données de chaque utilisateur sont isolées (multi-tenant).

## Lancer le projet en local

Prérequis : Node.js 22+, Docker (pour Postgres local).

```bash
docker compose up -d
cp .env.example .env   # renseigner AUTH_SECRET (commande fournie dans le fichier)
npm install
npx prisma migrate deploy
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000) et créer un compte sur `/register`.

- `/` — colle une URL d'offre : détection automatique si déjà connue, sinon création automatique (scraping du titre/entreprise/logo), avec repli manuel si le scraping échoue.
- `/board` — Kanban (À postuler / Postulé / Entretien / Refusé), drag & drop, recherche, tags, relances, édition/suppression.
- `/analytics` — funnel de conversion, heatmap de fréquence de candidature.
- `/account` — suppression de compte (cascade sur toutes les données).
- Export CSV — accessible depuis le Board et Analytics.
- `/harvester` — collecte automatisée d'offres (fusion de l'ancien outil `job-harvester`) :
  - `/harvester/campaigns` — création/édition/suppression de campagnes (mots-clés, codes ROME, zones géographiques, types de contrat, cibles Workday/SmartRecruiters/Talentsoft/DigitalRecruiters), déclenchement manuel de la collecte.
  - `/harvester/review` — file de revue des offres collectées : import vers le board ou rejet, filtres, actions groupées, statut des connecteurs.
  - Déclenchement planifié quotidien via Vercel Cron (`vercel.json`, `/api/cron/harvest`) en plus du déclenchement manuel — voir `docs/decision-scheduling-harvester.md`.
  - Connecteurs : France Travail, La Bonne Alternance (tier 0, clé API requise) · Workday, SmartRecruiters, Welcome to the Jungle, Talentsoft, DigitalRecruiters (tier 1, ciblage par entreprise/domaine ou clé optionnelle).

## Configuration

Toutes les variables d'environnement sont documentées (et leur caractère optionnel précisé) dans `.env.example`. Principales :

- `DATABASE_URL` / `DIRECT_URL` — connexion Postgres, respectivement poolée (exécution) et directe (migrations) ; en local les deux pointent vers le même Postgres docker-compose.
- `AUTH_SECRET` — secret de signature de session, obligatoire.
- `BRANDFETCH_CLIENT_ID`, `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` — optionnels, la fonctionnalité correspondante (fallback logo, monitoring d'erreurs) se désactive silencieusement si absents.
- `FOLLOW_UP_DAYS` (`lib/constants.ts`) — délai avant badge « Relancer ? » (7 jours par défaut).
- `FRANCE_TRAVAIL_CLIENT_ID` / `_SECRET`, `LBA_API_KEY` — requis pour activer les connecteurs tier 0 correspondants ; connecteur inactif (pas d'erreur) sans eux.
- `WTTJ_ALGOLIA_APP_ID` / `_API_KEY` — optionnels, connecteur Welcome to the Jungle inactif sans eux.
- `CRON_SECRET` — protège `/api/cron/harvest` (déclenchement planifié Vercel Cron) ; sans lui, la route répond 401 à toute requête, y compris celles de Vercel lui-même.

## Tests

```bash
npm test                 # unitaires (Vitest)
npm run test:coverage    # unitaires + rapport de couverture (seuil 70%)
npm run test:integration # contre le Postgres local (docker compose)
npm run test:e2e         # E2E (Playwright, build de production en CI)
```

## Stack

Next.js 16 (App Router, Server Actions) · Auth.js (Credentials) · Prisma + PostgreSQL · Tailwind CSS + shadcn/ui + Base UI · @dnd-kit · Cheerio + Playwright (scraping) · robots-parser (conformité robots.txt du module Harvester) · Vitest + Playwright (tests) · Sentry (monitoring, optionnel) · Vercel Cron (collecte planifiée)

## Déploiement

Procédure de déploiement et de rollback (code + migrations Postgres) :
[`docs/runbook-deploiement.md`](docs/runbook-deploiement.md).

## Sécurité

Revue des secrets et procédure de rotation en cas de fuite :
[`docs/gestion-des-secrets.md`](docs/gestion-des-secrets.md). Chiffrement
in-transit/at-rest des données : [`docs/chiffrement-donnees.md`](docs/chiffrement-donnees.md).
Politique de sauvegarde et procédure de restauration :
[`docs/sauvegardes-donnees.md`](docs/sauvegardes-donnees.md). Revue de sécurité du module
Harvester : [`docs/securite-harvester.md`](docs/securite-harvester.md).
