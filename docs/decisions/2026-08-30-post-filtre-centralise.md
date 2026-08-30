# Décision technique — post-filtre centralisé contrat/mots-clés/localisation (JOB-73)

**Date** : 2026-08-30
**Statut** : Tranché

## Contexte

`runCampaign()` (`lib/harvester/orchestrator.ts`) collectait des offres via des connecteurs
hétérogènes (tier0 France Travail, tier1 Workday/SmartRecruiters/Talentsoft/Digital
Recruiters, tier2 scraping générique). Chaque connecteur appliquait — ou non — ses propres
pré-filtres contrat/mots-clés/localisation avant de retourner ses offres. Aucun point de
contrôle commun ne garantissait qu'une offre normalisée respectait bien les critères de la
campagne (`HarvestQuery`), donc rien n'empêchait un connecteur sans pré-filtre (ou avec un
pré-filtre bugué) de faire persister silencieusement une offre hors-cible.

Deux approches étaient possibles :

1. Dupliquer un filtre dans chaque connecteur (approche initialement envisagée dans JOB-65/
   JOB-68/JOB-69, avant refonte).
2. Un filtre unique, centralisé, appliqué après `normalize()` pour tous les connecteurs.

## Décision

**Post-filtre centralisé** (option 2) : `lib/harvester/query-filter.ts` expose une fonction
pure `offerMatchesQuery(offer, query)`, appelée dans `runCampaign()` juste après
`connector.normalize(raw)` et avant l'upsert, pour **tous** les tiers de connecteurs. Elle
vérifie `contractType`, `keywords` (regex `\b...\b` sur titre + description) et `location`
(comparaison de département, dérivé du code postal).

Ce choix évite de dupliquer 5+ fois la même logique et garantit qu'aucun connecteur ne peut
ignorer un filtre silencieusement, quel que soit son tier. Les pré-filtres déjà présents dans
certains connecteurs tier1 (efficacité réseau — éviter des appels de détail inutiles) sont
conservés : le filtre centralisé est un filet de sécurité final, pas un remplacement.

**Politique fail-closed sur la localisation** : une offre qu'on ne peut pas prouver conforme
n'est pas considérée conforme. Le compromis inverse (inclure par défaut) aurait réintroduit
silencieusement le problème que ce ticket résout.

**Correctif JOB-75/77 (2026-08-30, porté depuis job-harvester)** : la comparaison initiale
(égalité stricte de département) faisait tomber Workday et WTTJ en fail-closed *systématique*
— Workday n'expose ni coordonnées ni code postal (seulement un nom de ville libre), et un
connecteur `locationScoped:false` (Workday, SmartRecruiters, Talentsoft, DigitalRecruiters)
n'étant fetché qu'une fois avec la première localisation de la campagne, ses offres n'étaient
jamais vérifiées contre les localisations suivantes. `resolveLocationVerdict()`
(`lib/harvester/query-filter.ts`) remplace l'égalité stricte par une cascade à 3 niveaux, du
plus fiable au plus grossier : rayon géographique (haversine) si l'offre a ses propres
coordonnées (WTTJ, La Bonne Alternance), puis égalité de département (comportement historique,
France Travail/SmartRecruiters/Talentsoft/DigitalRecruiters), puis correspondance par nom de
ville normalisé en dernier recours (Workday). `offerMatchesQuery` reçoit désormais
`acceptableLocations`, dérivé de **toutes** les localisations de la campagne
(`acceptableLocationsFromLocations`), et non plus de la seule requête de l'itération de boucle
courante — ce qui corrige les deux bugs à la fois.

## Suites (JOB-76)

- Le rejet pour localisation non vérifiable (`location_unresolved`) est désormais compté et
  loggé une seule fois par run (agrégé), pas une ligne par offre.
- `ConnectorRun.filteredCount` distingue les rejets du post-filtre (`rejectedCount` reste
  réservé aux échecs de `normalize()`).
