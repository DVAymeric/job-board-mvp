# Suivi de candidatures

Suivi de candidatures d'emploi en Kanban : colle une URL d'offre, l'app détecte automatiquement si tu l'as déjà vue ou crée la candidature (titre, entreprise et logo récupérés automatiquement). Board avec drag & drop, archives, analytics (funnel de conversion, heatmap de fréquence), tags, contacts, notes, export/import CSV/JSON.

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
- `/archives` — candidatures archivées, désarchivage ou suppression définitive.
- `/analytics` — funnel de conversion, heatmap de fréquence de candidature.
- `/account` — suppression de compte (cascade sur toutes les données).
- Export CSV/export-import JSON (sauvegarde complète) — accessibles depuis la barre de navigation.

## Configuration

Toutes les variables d'environnement sont documentées (et leur caractère optionnel précisé) dans `.env.example`. Principales :

- `DATABASE_URL` / `DIRECT_URL` — connexion Postgres, respectivement poolée (exécution) et directe (migrations) ; en local les deux pointent vers le même Postgres docker-compose.
- `AUTH_SECRET` — secret de signature de session, obligatoire.
- `BRANDFETCH_CLIENT_ID`, `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` — optionnels, la fonctionnalité correspondante (fallback logo, monitoring d'erreurs) se désactive silencieusement si absents.
- `FOLLOW_UP_DAYS` (`lib/constants.ts`) — délai avant badge « Relancer ? » (7 jours par défaut).

## Tests

```bash
npm test                 # unitaires (Vitest)
npm run test:coverage    # unitaires + rapport de couverture (seuil 70%)
npm run test:integration # contre le Postgres local (docker compose)
npm run test:e2e         # E2E (Playwright, build de production en CI)
```

## Stack

Next.js 16 (App Router, Server Actions) · Auth.js (Credentials) · Prisma + PostgreSQL · Tailwind CSS + shadcn/ui + Base UI · @dnd-kit · Cheerio + Playwright (scraping) · Vitest + Playwright (tests) · Sentry (monitoring, optionnel)
