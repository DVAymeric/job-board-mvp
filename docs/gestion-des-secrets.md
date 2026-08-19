# Gestion des secrets

## Addendum module Harvester (JOB-54)

La revue explicite ci-dessous (JOB-118) date du 14 août 2026, avant la fusion du module
Harvester — elle ne couvre donc pas ses secrets propres. Mêmes garanties déjà en place et
inchangées pour eux : jamais commités (`.env.example` les liste vides), couverts par le même
`gitleaks detect` en CI (`secret-scan`), même politique "jamais dans le code ni dans Git".

| Secret | Obligatoire ? | Effet si absent |
|---|---|---|
| `FRANCE_TRAVAIL_CLIENT_ID` / `_SECRET` | Non | Connecteur France Travail inactif (health check `ok:false`), pas d'erreur pour les autres connecteurs. |
| `LBA_API_KEY` | Non | Connecteur La Bonne Alternance inactif, idem. |
| `WTTJ_ALGOLIA_APP_ID` / `_API_KEY` | Non | Connecteur Welcome to the Jungle inactif (`supports()` renvoie `false`), idem. |
| `CRON_SECRET` | Non (mais recommandé en production) | `/api/cron/harvest` répond 401 à toute requête, y compris celles de Vercel Cron lui-même — la collecte planifiée ne se déclenche jamais tant qu'il n'est pas configuré côté Vercel. Le déclenchement manuel (`/harvester/campaigns`) reste utilisable sans lui. |

Aucun de ces secrets n'est requis pour que le reste de l'app (board, analytics, compte) fonctionne
— le module Harvester se dégrade silencieusement connecteur par connecteur, jamais l'app entière.

## Revue explicite (JOB-118)

Revue effectuée le 14 août 2026 :

- `gitleaks detect` (working tree + historique complet des commits, sans
  `--no-git`) : **107 commits scannés, aucune fuite détectée.** Commande
  reproductible : `gitleaks detect -v --redact`.
- `.env.example` audité ligne par ligne : `AUTH_SECRET`,
  `BRANDFETCH_CLIENT_ID`, `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`,
  `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` sont tous vides
  (aucune valeur par défaut committée). `DATABASE_URL`/`DIRECT_URL` ont une
  valeur en dur (`jobtracker:jobtracker@localhost:5433`), mais ce n'est pas
  un secret réel : c'est l'identifiant fixe du Postgres **local**
  docker-compose (`docker-compose.yml`, lui aussi committé), jamais exposé
  hors de `localhost` — même principe que le `DATABASE_URL` factice utilisé
  dans le job CI `test`.
- `git ls-files | grep '\.env'` ne retourne que `.env.example` — aucun
  `.env` réel n'a jamais été committé.

Cette revue est désormais automatisée en continu, pas seulement ponctuelle :
le job CI `secret-scan` ([JOB-122](https://linear.app/jobs-boards/issue/JOB-122))
fait tourner gitleaks sur chaque PR et échoue si un secret y apparaît ; le
job `check-dev-artifacts` ([JOB-60](https://linear.app/jobs-boards/issue/JOB-60))
bloque tout fichier de DB/log de dev versionné par erreur.

## Où vivent les secrets réels

Jamais dans le code ni dans Git. Uniquement en variables d'environnement :

- **Production/Preview** : variables d'environnement Vercel, chiffrées,
  configurées par environnement (Development / Preview / Production) une
  fois le déploiement connecté ([JOB-111](https://linear.app/jobs-boards/issue/JOB-111)).
- **CI** (GitHub Actions) : secrets de dépôt GitHub (`secrets.*`) — à ce
  jour seul `GITHUB_TOKEN`, auto-fourni et auto-rotaté par GitHub par
  exécution de workflow, est utilisé (job `secret-scan`).
- **Local** : fichier `.env` (gitignored), jamais partagé — voir
  `.env.example` pour la liste complète et le caractère optionnel de
  chaque variable.

## Procédure de rotation en cas de fuite

Étapes générales, dans l'ordre :

1. **Révoquer/régénérer immédiatement** le secret à la source (dashboard du
   fournisseur — voir tableau ci-dessous).
2. **Mettre à jour** la nouvelle valeur partout où elle est configurée
   (Vercel, par environnement concerné ; secrets GitHub si utilisé en CI ;
   `.env` local si nécessaire).
3. **Redéployer** — un changement de variable d'environnement Vercel ne
   redéploie pas automatiquement l'app en cours d'exécution ; déclencher un
   redeploy manuel (ou un nouveau commit) pour que la nouvelle valeur
   prenne effet.
4. **Confirmer** : `gitleaks detect` en local pour vérifier que l'ancienne
   valeur n'apparaît plus dans le working tree ; si elle avait été
   committée par erreur, purger l'historique (`git filter-repo` ou BFG +
   force-push) reste recommandé pour l'hygiène du dépôt, même si la valeur
   révoquée à l'étape 1 est déjà inerte.

| Secret | Où le régénérer | Effet de la rotation |
|---|---|---|
| `AUTH_SECRET` | Générer une nouvelle valeur (commande dans `.env.example`) | Toutes les sessions actives (JWT signés avec l'ancien secret) deviennent invalides — chaque utilisateur doit se reconnecter. Aucune perte de données. |
| `DATABASE_URL` / `DIRECT_URL` | Dashboard du fournisseur Postgres managé (mot de passe de l'utilisateur DB) | Coupure de connexion tant que la nouvelle valeur n'est pas déployée partout ; aucune perte de données. |
| `BRANDFETCH_CLIENT_ID` | Dashboard Brandfetch | Fallback logo Brandfetch indisponible entre la révocation et le déploiement de la nouvelle valeur (dégradation silencieuse, pas une erreur bloquante — cf. JOB-15). |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | Sentry → Project Settings → régénérer le DSN | Événements perdus entre la régénération et le déploiement de la nouvelle valeur, sans impact utilisateur (le SDK échoue silencieusement, cf. JOB-113). |
| `SENTRY_AUTH_TOKEN` | Sentry → régénérer le token, révoquer l'ancien | Aucun impact utilisateur — n'affecte que l'upload des source maps au build suivant. |
| `FRANCE_TRAVAIL_CLIENT_ID` / `_SECRET` | Espace développeur [francetravail.io](https://francetravail.io) → application enregistrée | Connecteur France Travail inactif entre la révocation et le déploiement de la nouvelle valeur ; aucune perte de données déjà collectées. |
| `LBA_API_KEY` | Dashboard [api.apprentissage.beta.gouv.fr](https://api.apprentissage.beta.gouv.fr) | Connecteur La Bonne Alternance inactif entre-temps, idem. |
| `WTTJ_ALGOLIA_APP_ID` / `_API_KEY` | Dashboard Algolia associé au compte Welcome to the Jungle | Connecteur WTTJ inactif entre-temps, idem — jamais bloquant (déjà optionnel). |
| `CRON_SECRET` | Générer une nouvelle valeur (commande dans `.env.example`), la reporter côté Vercel (Project Settings → Environment Variables) | La collecte planifiée échoue en 401 tant que la nouvelle valeur n'est pas déployée des deux côtés (route + config Vercel Cron) ; le déclenchement manuel n'est pas affecté. |
