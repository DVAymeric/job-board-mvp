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

**Politique fail-closed sur la localisation** : si le département de l'offre normalisée n'est
pas résolu (ex. Workday, dont `normalize()` n'extrait aujourd'hui aucun département) alors que
la requête cible une localisation précise, l'offre est **exclue** plutôt qu'incluse par
défaut. Une offre qu'on ne peut pas prouver conforme n'est pas considérée conforme. Le
compromis inverse (inclure par défaut) aurait réintroduit silencieusement le problème que ce
ticket résout.

## Suites (JOB-76)

- Le rejet pour département manquant est désormais compté et loggé une seule fois par run
  (agrégé), pas une ligne par offre.
- `ConnectorRun.filteredCount` distingue les rejets du post-filtre (`rejectedCount` reste
  réservé aux échecs de `normalize()`).
