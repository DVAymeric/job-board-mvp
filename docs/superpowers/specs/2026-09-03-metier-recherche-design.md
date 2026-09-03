# Champ "Métier recherché" (suggestion ROME par recherche floue) — Design

**Date** : 2026-09-03
**Statut** : Validé (brainstorming), en attente de plan d'implémentation

## Contexte

Suite à un audit manuel des campagnes de `alex_2c@hotmail.fr` (6 campagnes Data
Analyst/Ing/Sci × Alternance/Stage) : toutes avaient `romeCodes: []`, et leurs mots-clés
— bien que pertinents sur le plan technique — ne contenaient jamais le nom du métier
lui-même ("data analyst", "data engineer"...). Corrigé à la main pour ces 6 campagnes,
mais le problème est structurel : le formulaire de campagne (`CampaignFormDialog`) ne
demande explicitement ni l'un ni l'autre. Il expose "Mots-clés" (libre) et "Codes ROME
(optionnel)" (code brut à 5 caractères, illisible pour un non-initié), mais rien qui
réponde directement à la question qu'un chercheur d'emploi se pose spontanément : "je
cherche quel poste ?" — cohérent avec l'axe grand public déjà engagé sur le Harvester
(JOB-149, JOB-151).

Trouvé en creusant le référentiel officiel pendant cet audit : les codes ROME "émergents"
comme `M1405` (Data scientist) et `M1811` (Data engineer) sont de vrais codes de premier
rang dans le registre France Travail (`referentiel_code_rome`, 1911 fiches), mais la table
des appellations courantes (`referentiel_appellation`, 14301 entrées) route les libellés
textuels vers leur code "parent" plus large (`M1403`, `M1802`). Une recherche floue doit
donc combiner les deux tables plutôt que la seule table d'appellations, sous peine de perdre
en route la distinction Data Analyst / Data Scientist / Data Engineer que ce projet cherche
justement à préserver (convention JOB-67/JOB-71 : éviter le partage d'un ROME entre
campagnes de métiers distincts).

## Décisions actées (brainstorming)

1. **Référentiel embarqué, pas d'API live.** Le fichier open data officiel
   (`api.francetravail.fr/api-nomenclatureemploi/v1/open-data/json`, public, sans
   authentification, licence ouverte) est téléchargé et transformé une fois par un script
   ponctuel, puis commité dans le dépôt. Alternative écartée : l'API "ROME 4.0 — Fiches
   métiers" de francetravail.io, qui nécessiterait une souscription et des identifiants
   séparés de ceux déjà utilisés pour l'API Offres d'emploi, avec des détails d'intégration
   non vérifiables sans accès à leur portail développeur.
2. **Recherche floue assistée, jamais silencieuse.** L'utilisateur tape, voit une liste de
   métiers candidats, et choisit explicitement — le système ne devine jamais tout seul quel
   métier a été visé (la nomenclature a de vraies ambiguïtés, cf. Data Scientist ci-dessus ;
   personne ne doit lui faire une confiance aveugle).
3. **Sélection d'un métier a deux effets de bord**, reproduisant ce qui a été fait à la main
   pour les 6 campagnes de `alex_2c@hotmail.fr` : ajoute le code ROME résolu à `romeCodes`
   (déjà existant) et le libellé du métier aux `keywords` (déjà existant) — pas de nouveau
   canal de filtrage, on réutilise les deux mécanismes déjà câblés dans l'orchestrateur.
4. **"Codes ROME" reste éditable en secours.** Le nouveau champ ne remplace pas l'existant ;
   il en devient le chemin principal, l'ancien restant disponible pour les cas que la
   recherche floue ne couvre pas bien ou une correction manuelle.
5. **Réutilisation, pas de nouvelle dépendance.** La similarité utilise `trigramSimilarity`
   déjà présent (`lib/harvester/similarity.ts`, utilisé par `isFuzzyDuplicate`) — pas de
   nouvelle librairie de recherche floue/texte.

## Modèle de données

Un seul champ ajouté au modèle existant.

```prisma
model Campaign {
  // ... champs existants inchangés ...
  metiers String[] @default([])
}
```

`metiers` stocke les **libellés choisis par l'utilisateur** ("Data Analyst"), pour un
affichage lisible sur la carte de campagne (`CampaignRow`) — remplace à terme le rôle
que `campaign.slug` (technique, non prévu pour être lu par l'utilisateur — voir JOB-162,
fermé "pas un bug" mais dont la confusion vient précisément de l'absence d'un tel champ
explicite) joue aujourd'hui. Ce n'est **pas** une source de vérité pour le filtrage : le
filtrage reste entièrement porté par `romeCodes` et `keywords`, déjà branchés dans
`offerMatchesQuery`/`buildSearchUrl`. `metiers` peut diverger de ces deux champs si
l'utilisateur les modifie ensuite manuellement (ex. retire un mot-clé) — c'est acceptable,
au même titre que `name` peut diverger de `slug` aujourd'hui.

Migration Prisma simple (`@default([])`), aucune donnée à rétro-remplir : les campagnes
existantes affichent `metiers: []` (retombent sur `slug` comme aujourd'hui) tant que
l'utilisateur n'a pas utilisé le nouveau champ.

## Composants

### 1. Référentiel — `lib/harvester/rome-referentiel.json`

Généré par `scripts/import-rome-referentiel.ts` (à relancer manuellement au rythme des
mises à jour officielles, ~2×/an) :

1. Télécharge le zip `api.francetravail.fr/api-nomenclatureemploi/v1/open-data/json`.
2. Extrait `unix_referentiel_code_rome_v461.json` (1911 fiches métier — inclut les codes
   émergents comme M1405/M1811 comme entrées de premier rang) et
   `unix_referentiel_appellation_v461.json` (14301 appellations courantes, chacune associée
   au `code_rome_parent`).
3. Fusionne les deux en une liste dédupliquée de paires `{ libelle, code }` — vérifié en
   amont de ce document : ~15 700 entrées uniques, ~1,2 Mo une fois minifié. Committé tel
   quel dans le dépôt (pas de téléchargement à l'exécution).

Encodage source : `cp1252` (confirmé en inspectant les fichiers), à convertir en UTF-8
par le script d'import — le fichier généré est UTF-8 standard.

### 2. Recherche floue — `lib/harvester/rome-search.ts`

```ts
export interface MetierMatch {
  libelle: string;
  romeCode: string;
  score: number; // 0-1, trigramSimilarity
}

export function searchRomeReferentiel(query: string, limit = 8): MetierMatch[]
```

Charge `rome-referentiel.json` une fois (module-level, comme un cache statique — pas de
rechargement par requête), normalise `query` et chaque `libelle` avec le même couple
minuscules + `stripDiacritics` que `query-filter.ts`/`merge.ts` (comportement cohérent
avec le reste du code, pas une nouvelle règle de normalisation), calcule
`trigramSimilarity` contre chaque entrée, retourne les `limit` meilleurs scores non nuls,
triés décroissant. Une requête trop courte (< 2 caractères) retourne `[]` sans calcul —
évite un scan de 15 700 entrées sur chaque frappe d'une seule lettre.

### 3. Server Action — `app/actions/campaigns.ts`

```ts
export async function searchMetiers(query: string): Promise<ActionResult<{ matches: MetierMatch[] }>>
```

Fine couche d'auth (`requireUser`, comme les autres actions de ce fichier) + appel à la
fonction pure ci-dessus. Le référentiel (1,2 Mo) ne quitte jamais le serveur — c'est la
raison d'être de cette action plutôt qu'un import direct côté client.

### 4. UI — `CampaignFormDialog`

Nouveau champ "Métier recherché", au-dessus de "Mots-clés" (c'est la première question
qu'un utilisateur se pose) :

- `Input` texte avec debounce (`useState` + `useEffect`/`setTimeout`, même idiome que
  `SEARCH_DEBOUNCE_MS`/`debouncedSearch` dans `components/board/board.tsx` — sauf que là
  le debounce déclenche un appel réseau à la Server Action, pas un simple filtre en
  mémoire ; 300 ms plutôt que les 200 ms du board, pour limiter le nombre d'appels serveur).
- Résultats affichés dans une liste déroulante sous le champ (libellés seuls, pas le code
  ROME brut — cohérent avec l'objectif grand public).
- Sélection d'un résultat : ajoute son libellé à `metiers` (pastille, retirable comme les
  pastilles de mots-clés existantes), ajoute son `romeCode` à `romeCodes` si absent, ajoute
  son libellé (en minuscules, cohérent avec le style des mots-clés déjà en base) à
  `keywords` si absent.
- Aucune correspondance : message "Aucun métier trouvé pour « ... »" sous le champ,
  formulaire non bloqué — l'utilisateur peut continuer avec mots-clés/ROME manuels comme
  aujourd'hui (aucune régression du chemin existant).

`CampaignRow` (carte de campagne) affiche `campaign.metiers.join(" · ")` à la place de
`campaign.slug` quand `metiers` n'est pas vide, sinon retombe sur le comportement actuel.

## Gestion d'erreur

- Référentiel absent/corrompu (ne devrait jamais arriver, fichier committé) :
  `searchRomeReferentiel` retourne `[]`, pas d'exception qui remonterait jusqu'à l'UI.
- Aucun résultat : traité comme un cas normal (pas une erreur), message neutre.
- Server Action : suit le pattern `ActionResult` existant (`app/actions/_shared.ts`),
  pas de nouveau type d'erreur.

## Tests

- `rome-search.test.ts` : requête vide/courte → `[]` ; "data scientist" trouve M1405 en
  tête (pas seulement M1403) ; insensible accents/casse ; limite respectée.
- `campaigns.test.ts` (Server Action) : auth requise, délègue à `searchMetiers`.
- `campaign-form-dialog.test.tsx` : frappe → suggestions affichées ; sélection → pastille
  ajoutée + `romeCodes`/`keywords` mis à jour ; aucune correspondance → message, formulaire
  toujours soumissible avec les champs existants.
- `campaign-row.test.tsx` : affiche `metiers` en priorité sur `slug` quand présent.

## Hors périmètre

- Pas de ré-indexation automatique du référentiel (le script d'import reste une action
  manuelle, déclenchée par un développeur).
- Pas de rétro-remplissage des campagnes existantes (dont les 6 déjà corrigées à la main) —
  `metiers` reste vide pour elles tant que l'utilisateur ne relance pas le champ lui-même ;
  pas une régression, juste un affichage `slug` inchangé pour ces campagnes précises.
- Pas de suppression du champ "Codes ROME" manuel ni de la logique de validation associée
  (JOB-160) — les deux chemins coexistent.
