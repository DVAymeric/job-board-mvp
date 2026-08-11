# Suivi de candidatures

Petit outil local, mono-utilisateur, pour suivre ses candidatures d'emploi : vérifier en un coup d'œil si une offre a déjà été postulée, et visualiser toutes ses candidatures dans un Kanban.

Aucun compte, aucune authentification, aucun déploiement — tout tourne en local avec une base SQLite.

## Lancer le projet

```bash
npm install
npx prisma migrate dev
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

- `/` — colle une URL d'offre pour savoir si tu as déjà postulé, ou ajoute-la si c'est nouveau.
- `/board` — vue Kanban (À postuler / Postulé / Entretien / Refusé), drag & drop entre colonnes, détails et relance dans le panneau latéral.

## Configuration

- Base de données SQLite locale : fichier défini par `DATABASE_URL` dans `.env` (`prisma/dev.db` par défaut).
- Délai avant badge "Relancer ?" : constante `FOLLOW_UP_DAYS` dans `lib/constants.ts` (7 jours par défaut).

## Stack

Next.js (App Router, Server Actions) · Prisma + SQLite · Tailwind CSS + shadcn/ui · @dnd-kit
