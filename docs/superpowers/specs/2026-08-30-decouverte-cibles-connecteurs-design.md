# Découverte automatique de cibles connecteurs — Design

**Date** : 2026-08-30
**Statut** : Validé (brainstorming), en attente de plan d'implémentation

## Contexte

job-harvester (le projet d'origine, avant fusion dans job-board-mvp) sonde périodiquement les
entreprises déjà vues dans les offres collectées pour deviner si elles publient aussi sur
Workday, SmartRecruiters, Talentsoft ou DigitalRecruiters — des connecteurs "tier1" qui
nécessitent un ciblage explicite par entreprise (`config.targets`), contrairement aux
connecteurs "grands" (France Travail, La Bonne Alternance, WTTJ) qui cherchent directement sans
ciblage. Une entreprise repérée via France Travail (ex. "Capgemini") peut ainsi être ajoutée
comme cible explicite, élargissant la couverture des futures collectes sans intervention
manuelle.

Cette fonctionnalité n'a jamais été portée dans job-board-mvp (voir l'audit de faisabilité de
fusion, plus tôt dans ce fil). Elle représente ~25 commits côté job-harvester : table
`discovery_probes`, 4 sondes par plateforme, orchestrateur, réécriture de `campaigns.yaml`, UI.

**Différence architecturale clé** : job-harvester est mono-tenant et réécrit un unique fichier
`campaigns.yaml` partagé sur disque. job-board-mvp est multi-tenant (Prisma/Postgres), chaque
campagne est une ligne scopée `userId` avec son propre `config.targets` (JSON). Ce document
adapte le mécanisme à cette architecture — ce n'est pas un simple portage 1:1.

## Décisions actées (brainstorming)

1. **Cibles trouvées → file de revue à approuver**, pas d'ajout automatique et silencieux —
   cohérent avec le pattern déjà établi pour les offres collectées (JOB-51).
2. **Une cible approuvée s'ajoute à toutes les campagnes de l'utilisateur (le modèle Campaign n'a pas de notion active/inactive : toutes ses lignes sont éligibles)** — pas de
   sélection de campagne(s) à l'approbation (comme job-harvester, qui ajoute à toutes les
   campagnes de `campaigns.yaml`).
3. **Cache de sondage global**, partagé entre tous les comptes — c'est un fait public sur
   l'infrastructure d'une entreprise (son ATS), pas une donnée utilisateur. Seule exception au
   découpage systématique par `userId` appliqué partout ailleurs dans le harvester (JOB-46) —
   documentée explicitement ci-dessous.
4. **Déclenchement uniquement après une collecte manuelle** (`triggerCampaignCollection`),
   jamais dans le cron — évite d'ajouter ~80 requêtes sortantes (20 entreprises × 4 plateformes)
   à chaque réveil de cron silencieux.

## Modèle de données

Deux nouveaux modèles Prisma.

### `DiscoveryProbe` — global, sans `userId`

```prisma
enum DiscoveryPlatform {
  WORKDAY
  SMARTRECRUITERS
  TALENTSOFT
  DIGITALRECRUITERS
}

model DiscoveryProbe {
  id          String            @id @default(uuid())
  companySlug String
  platform    DiscoveryPlatform
  found       Boolean
  // Forme dépend de la plateforme : string (domaine) pour SmartRecruiters/Talentsoft/
  // DigitalRecruiters, { tenant, site, dc } pour Workday. Toujours null si found=false.
  target      Json?
  probedAt    DateTime          @default(now())

  @@unique([companySlug, platform])
}
```

Une ligne est écrite pour CHAQUE tentative (trouvé ou pas), sauf si la sonde a levé une
exception (timeout, DNS, réseau) — dans ce cas, rien n'est écrit, pour que la paire
(entreprise, plateforme) reste éligible à un nouvel essai plus tard plutôt que d'être
définitivement classée "pas trouvée" à cause d'un incident transitoire.

**Écart assumé au découpage par `userId`** : cette table n'est PAS scopée par utilisateur. Elle
ne contient aucune donnée utilisateur — seulement des faits publics et vérifiables sur
l'infrastructure de recrutement d'entreprises réelles (ex. "capgemini.com utilise
myworkdayjobs.com"), au même titre que les offres elles-mêmes collectées depuis des sources
publiques. Partager ce cache évite de re-sonder en direct la même entreprise pour chaque
utilisateur qui la croise (charge réseau, risque de rate-limit/blocage IP côté plateformes
sondées).

### `DiscoveredTarget` — par utilisateur, file de revue

```prisma
enum DiscoveredTargetStatus {
  PENDING
  ADDED
  REJECTED
}

model DiscoveredTarget {
  id          String                 @id @default(uuid())
  userId      String
  user        User                   @relation(fields: [userId], references: [id], onDelete: Cascade)
  companySlug String
  companyName String
  platform    DiscoveryPlatform
  target      Json
  status      DiscoveredTargetStatus @default(PENDING)
  discoveredAt DateTime              @default(now())
  reviewedAt  DateTime?

  @@unique([userId, companySlug, platform])
  @@index([userId, status])
}
```

`companyName` (non normalisé) est dupliqué depuis `HarvestedOffer` au moment de la création,
pour un affichage lisible dans la file de revue sans jointure. `@@unique([userId, companySlug,
platform])` garantit qu'un hit déjà PENDING ou ADDED pour un utilisateur n'est jamais recréé en
double si la découverte tourne à nouveau (ex. après qu'un autre utilisateur ait déclenché le
même hit entre-temps).

## Dérivation des candidats & sondage

Nouveau module `lib/harvester/discovery/discover-targets.ts`, orchestrateur pur (comme
`orchestrator.ts`) :

1. Récupère les `companyNormalizedName` distincts des `HarvestedOffer` de l'utilisateur
   déclencheur (`companySlug`, dérivé via `normalizeCompanyName` déjà existant dans
   `lib/harvester/company-name.ts`).
2. Écarte tout candidat pour lequel une ligne `DiscoveryProbe` existe déjà pour les 4
   plateformes ("entièrement sondé").
3. Plafonne à 20 nouvelles entreprises par run (valeur de job-harvester, non configurable —
   YAGNI).
4. Pour chaque candidat, sonde les 4 plateformes qui n'ont pas encore de ligne
   `DiscoveryProbe` pour ce candidat (reprise partielle après un run interrompu) :
   - **Workday** (`lib/harvester/discovery/probe-workday.ts`) : POST vers
     `https://{tenant}.{dc}.myworkdayjobs.com/wday/cxs/{tenant}/{tenant}_jobs/jobs` sur 3
     datacenters candidats (`wd1`, `wd3`, `wd5`), `tenant` dérivé du slug sans tirets.
   - **SmartRecruiters** (`probe-smartrecruiters.ts`) : GET
     `https://api.smartrecruiters.com/v1/companies/{SLUG}/postings?limit=1`, `totalFound > 0`.
   - **Talentsoft** (`probe-talentsoft.ts`) : essaye 5 domaines candidats
     (`recrutement.{slug}.fr`, `{slug}-recrute.talent-soft.com`, etc.), vérifie `robots.txt` via
     `lib/harvester/robots.ts` (déjà existant) avant chaque fetch, cherche une empreinte
     `__VIEWSTATE|talentsoft` dans le HTML.
   - **DigitalRecruiters** (`probe-digitalrecruiters.ts`) : POST vers
     `https://api.digitalrecruiters.com/public/v1/careers-site/job-ads` avec le domaine deviné
     `joinus.{slug}.fr`.
   Chaque sonde a un timeout de 10s, réutilise `createRateLimitedFetch` (déjà utilisé par
   `orchestrator.ts`) et `USER_AGENT` (déjà existant).
5. Écrit la ligne `DiscoveryProbe` correspondante (trouvé ou pas), sauf exception.
6. Sur un hit, crée une ligne `DiscoveredTarget` (PENDING) pour l'utilisateur déclencheur — sauf
   si une ligne existe déjà pour ce `(userId, companySlug, platform)` (contrainte unique, upsert
   silencieux plutôt qu'erreur).

## Déclenchement

Câblé dans `triggerCampaignCollection` (`app/actions/harvest.ts`), après que
`runCampaignAcrossConnectors` a terminé pour la campagne — un seul appel à `discoverTargets`,
pas un par connecteur. Erreurs de découverte capturées et journalées
(`logger.warn`/`logger.error`), sans jamais faire échouer ni remonter d'erreur sur l'action de
collecte principale : la découverte est un bonus best-effort, pas une garantie.

## UI de revue

Nouvel onglet **"Cibles découvertes"** dans `components/harvester/harvester-tabs.tsx`, aux
côtés de Campagnes / File de revue / Connecteurs. Badge de compteur sur les entrées PENDING
(même composant que le badge déjà utilisé pour la file de revue des offres, JOB-106).

Liste (nouveau composant `components/harvester/discovered-targets-manager.tsx`) : nom
d'entreprise, plateforme (via `ConnectorBadge` déjà existant), cible devinée (tenant/site pour
Workday, domaine pour les 3 autres), deux actions :

- **Approuver** → Server Action `approveDiscoveredTarget` (`app/actions/discovery.ts`) : ajoute
  la cible à `config.targets` de chaque campagne de l'utilisateur (dédupliqué — même
  logique que `addTargetToCampaigns` de job-harvester, adaptée en update Prisma), marque la
  ligne ADDED.
- **Rejeter** → `rejectDiscoveredTarget` : marque REJECTED. Pas de retour en arrière prévu
  (YAGNI, cohérent avec `ignoredAt` sur les offres qui n'a pas non plus d'annulation).

Les entrées ADDED/REJECTED ne réapparaissent pas dans la file (filtrées par `status: PENDING`)
mais restent en base pour audit.

## Hors périmètre (explicitement exclu de cette itération)

- Sélection de campagne(s) cible(s) à l'approbation (toujours "toutes les campagnes de l'utilisateur").
- Limite de sondage configurable (fixe à 20, comme job-harvester).
- Déclenchement automatique dans le cron.
- Annulation d'un rejet (pas d'undo).
- Connecteurs tier2 (`jsonld-generic`, `sitemap-crawler`) — traités séparément, jamais mergés
  même côté job-harvester sur une branche à jour (cf. audit de faisabilité).

## Tests / vérification

Même méthode que les 3 chantiers précédents de cette session : TDD (RED avant chaque module de
sonde/orchestrateur), suite d'intégration Postgres pour `discoverTargets` (miroir de
`discover-targets.test.ts` de job-harvester, adapté au schéma multi-tenant), tests de composants
React pour l'UI de revue, puis vérification en direct contre au moins une vraie entreprise
connue pour être sur une des 4 plateformes (ex. Capgemini sur Workday) avant de considérer le
chantier terminé.
