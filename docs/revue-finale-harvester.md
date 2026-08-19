# Revue de sécurité finale et bilan de non-régression — module Harvester (JOB-56)

Revue transverse de clôture de la fusion job-harvester → job-board-mvp (Tickets 0-20, JOB-38 à
JOB-58), couvrant CORS, secrets, permissions, dépendances, et un bilan de non-régression
fonctionnelle "avant/après" sur les deux périmètres d'origine (jobboard existant + job-harvester).
Signée : Aymeric (porteur produit), 2026-08-19.

Cette revue ne réintroduit aucune fonctionnalité nouvelle — seuls les correctifs identifiés
ci-dessous ont été appliqués, conformément au périmètre du ticket. Tout écart qui dépasse un
correctif ponctuel a été consigné dans un ticket dédié plutôt que traité ici (JOB-59).

## 1. CORS

Aucun en-tête CORS n'est fixé nulle part dans le code applicatif (`grep -rn -i "cors\|Access-
Control-Allow"` sur `app/` et `lib/` : aucun résultat pertinent). Deux route handlers exposés :

* `app/api/auth/[...nextauth]/route.ts` — géré par Auth.js, comportement CORS par défaut du
  framework, hors périmètre du module Harvester.
* `app/api/cron/harvest/route.ts` — appelé serveur-à-serveur par Vercel Cron (pas par un
  navigateur), donc non concerné par CORS au sens propre (mécanisme d'application côté
  navigateur). Protégé par un secret partagé (cf. §2).

Aucune Server Action Harvester n'est exposée via une route HTTP publique indépendante — toutes
passent par le mécanisme Server Actions de Next.js (POST same-origin signé, pas de surface CORS
distincte à auditer).

## 2. Secrets

* **Clés API tierces** (`FRANCE_TRAVAIL_CLIENT_ID/_SECRET`, `LBA_API_KEY`,
  `WTTJ_ALGOLIA_APP_ID/_API_KEY`) : lues depuis `process.env`/`ConnectorContext.env`, jamais
  loggées (vérifié : aucun `logger.*`/`console.*` ne les interpole), jamais renvoyées dans un
  payload `rawPayload` ou une réponse Server Action. Politique par-déploiement documentée dans
  `docs/gestion-des-secrets.md` (JOB-54) — pas de changement.
* **`CRON_SECRET`** — **écart trouvé et corrigé** : `app/api/cron/harvest/route.ts` comparait
  l'en-tête reçu à `` `Bearer ${process.env.CRON_SECRET}` `` sans vérifier que la variable
  d'environnement était bien définie. Si `CRON_SECRET` n'est pas configuré sur le déploiement
  (erreur de configuration, pas un scénario nominal), la comparaison devenait
  `"Bearer undefined"` — une requête portant littéralement cet en-tête aurait été acceptée à
  tort. Corrigé : la route retourne désormais 401 systématiquement quand `CRON_SECRET` est absent,
  quel que soit l'en-tête reçu. Reproduit par un test qui échouait avant correctif
  (`app/api/cron/harvest/route.test.ts`, "returns 401 for the literal header 'Bearer undefined'
  even when CRON_SECRET is unset"), vert après.

## 3. Permissions / isolation multi-tenant

Re-vérifié sans modification de code (déjà couvert en profondeur au Ticket 8, JOB-46,
`docs/securite-harvester.md` §Isolation multi-tenant) : suite d'intégration
`app/actions/campaigns.isolation.integration.test.ts` + les 37 tests de
`npm run test:integration` rejoués contre un Postgres local frais — tous verts. Aucune régression
d'isolation introduite par les tickets 15-20 (observabilité, docs, connecteurs tier1
additionnels, tier2).

## 4. Dépendances

`npm audit --omit=dev` : 3 vulnérabilités « high » sur la chaîne `prisma@6.19.3` →
`@prisma/config` → `deepmerge-ts`. Confirmé pré-existant sur `main` avant tout travail Harvester
(vérifié via `git show main:package.json`/`package-lock.json` en tout début de fusion) — hors
périmètre de ce ticket, pas de bump majeur non sollicité. Aucune des dépendances ajoutées par la
fusion (`cheerio`, `playwright`/`playwright-core`, `robots-parser`, `ulid`, `yaml`) n'apparaît
dans le rapport `npm audit`.

## 5. rawPayload anti-PII (ADR-0004) — les 9 connecteurs

L'addendum du ticket demandait une vérification explicite sur "7" connecteurs (rédigé avant les
tickets 19/20) ; la fusion en compte en réalité **9** au jour de cette revue. Vérifié pour
chacun — soit un test dédié qui injecte un champ contact/recruteur dans le payload brut et
vérifie son absence de `rawPayload`, soit (workday/smartrecruiters) un tel test venait de
manquer :

| Connecteur | `rawPayload` = résultat `.parse()` Zod | Test anti-PII dédié |
|---|---|---|
| francetravail | ✅ | ✅ (déjà présent) |
| labonnealternance | ✅ | ✅ (déjà présent) |
| workday | ✅ | **✅ — ajouté par cette revue** |
| smartrecruiters | ✅ | **✅ — ajouté par cette revue** |
| welcometothejungle | ✅ | ✅ (déjà présent) |
| talentsoft | ✅ | ✅ (déjà présent) |
| digitalrecruiters | ✅ | ✅ (déjà présent) |
| jsonld-generic | ✅ | ✅ (déjà présent, JOB-58) |
| sitemap-crawler | ✅ (réexporte jsonld-generic) | ✅ (réexporte le test jsonld-generic) |

workday et smartrecruiters n'avaient pas de champ contact identifié dans leurs schémas Zod
(`WorkdayRawOfferSchema`/`SmartRecruitersRawOfferSchema` n'utilisent pas `.passthrough()`, donc
tout champ hors schéma est de toute façon éliminé par construction) — la garantie structurelle
existait déjà, mais aucun test de non-régression ne la couvrait explicitement. Ajouté dans cette
revue (`workday/normalize.test.ts`, `smartrecruiters/normalize.test.ts`) pour égaliser la
couverture avec les 7 autres connecteurs et éviter qu'un futur ajout de champ au schéma ne
réintroduise silencieusement une fuite.

## 6. Bilan de non-régression — fonctionnalités "avant/après"

### Périmètre jobboard (job-board-mvp, avant fusion)

Aucune fonctionnalité existante retirée ou modifiée par la fusion — le module Harvester est
additif (`/harvester/*`, nouvelles tables Prisma, nouvelle entrée de nav). Suite complète
(839 tests unitaires/composants + 37 tests d'intégration) verte. Board, analytics, CSV export,
gestion des contacts/tags/notes : hors du diff de la fusion, non retouchés.

### Périmètre job-harvester (outil d'origine)

| Fonctionnalité job-harvester | État dans job-board-mvp |
|---|---|
| Connecteurs tier 0 (France Travail, LBA) | ✅ portés (Tickets 4/5) |
| Connecteurs tier 1 (Workday, SmartRecruiters, WTTJ, Talentsoft, DigitalRecruiters) | ✅ portés (Tickets 4/19) |
| Connecteurs tier 2 (jsonld-generic, sitemap-crawler) + conformité robots.txt | ✅ portés (Ticket 20, JOB-58) |
| Campagnes déclarées (`config/campaigns.yaml`) | ✅ **amélioré** — UI de création/édition/suppression en base (Ticket 12) au lieu d'un fichier YAML statique édité à la main |
| `POST /harvest/:campaignId/run` (déclenchement manuel) | ✅ porté — Server Action déclenchée depuis `/harvester/campaigns` (Ticket 14) |
| Scheduler cron par campagne (`ENABLE_SCHEDULER`, champ `schedule` par campagne) | ⚠️ **simplifié, décision documentée** — une cadence globale (Vercel Cron) plutôt qu'un scheduler par expression cron individuelle ; `docs/decision-scheduling-harvester.md` |
| `GET /connectors/health` — volet `lastRun` (dernier run en base) | ✅ porté (`ConnectorHealthList` sur `/harvester/review`, Ticket 13) |
| `GET /connectors/health` — volet `live` (`healthCheck()` en direct) | ❌ **régression identifiée — JOB-59 ouvert**, non bloquant (voir note ci-dessous) |
| Export/réimport des événements de candidature (scripts SQLite) | N/A — remplacé par Postgres/Prisma ; les événements de candidature sont une fonctionnalité du jobboard d'origine, pas du module Harvester, et n'ont jamais été en SQLite dans job-board-mvp |
| Doc "Ajouter une source" (onboarding connecteur) | ❌ non porté — absent de `docs/`, à traiter avec JOB-59 ou un ticket doc dédié si besoin futur d'ajouter un connecteur |
| Serveur HTTP Hono autonome | ✅ décommissionné délibérément (Ticket 10, JOB-48) — Server Actions + route Next.js le remplacent, pas un second serveur |

**Note sur JOB-59** : l'absence du volet `live` de `/connectors/health` est un écart réel mais non
bloquant pour la mise en production — elle dégrade la détection proactive d'une clé API expirée
(détectée au prochain run raté plutôt qu'à la demande), sans affecter la collecte elle-même ni
l'isolation/la sécurité des données. Conformément à la consigne du ticket ("tout écart doit
rouvrir un ticket dédié"), un ticket a été ouvert (JOB-59) plutôt que corrigé à la volée ici.

## Checklist de clôture

- [x] CORS revu — sans objet (aucun en-tête CORS personnalisé, cron protégé par secret).
- [x] Secrets revus — écart `CRON_SECRET` non défini trouvé et corrigé, testé.
- [x] Permissions/isolation multi-tenant re-vérifiées — 37/37 tests d'intégration verts.
- [x] Dépendances revues — vulnérabilités pré-existantes hors périmètre, aucune nouvelle
      dépendance de la fusion concernée.
- [x] rawPayload anti-PII vérifié sur les 9 connecteurs (pas seulement les 7 d'origine) —
      2 tests manquants ajoutés (workday, smartrecruiters).
- [x] Bilan de non-régression avant/après réalisé sur les deux périmètres.
- [x] Écart fonctionnel identifié (healthCheck live) — ticket dédié ouvert (JOB-59), non
      bloquant.
- [x] Suite complète verte : `tsc --noEmit`, `npm run lint` (0 erreur), 839 tests unitaires,
      37 tests d'intégration.
- [x] Aucun ticket bloquant ouvert.
