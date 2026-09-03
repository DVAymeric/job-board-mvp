# Champ "Métier recherché" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un champ "Métier recherché" au formulaire de campagne du Harvester, avec recherche floue assistée sur le référentiel ROME officiel, qui alimente automatiquement `romeCodes` et `keywords` à la sélection.

**Architecture:** Un référentiel ROME (code_rome + appellations, ~15 700 paires libellé→code) est importé une fois depuis l'open data officiel France Travail vers un fichier JSON committé (`lib/harvester/rome-referentiel.json`). Une fonction pure de recherche floue (réutilisant `trigramSimilarity` déjà présent) tourne côté serveur derrière une Server Action, appelée en debounce depuis un nouveau champ du formulaire de campagne. Sélectionner un résultat ajoute son libellé à un nouveau champ `Campaign.metiers` (affichage), son code à `romeCodes` (déjà existant) et son libellé à `keywords` (déjà existant) — pas de nouveau mécanisme de filtrage.

**Tech Stack:** Next.js 16 (Server Actions), Prisma/Postgres, Zod, Vitest + Testing Library, `unzip` (CLI, déjà présent sur les machines de dev/CI Linux) pour le script d'import ponctuel.

**Spec:** `docs/superpowers/specs/2026-09-03-metier-recherche-design.md`

## Global Constraints

- Le référentiel est embarqué (fichier committé), jamais téléchargé à l'exécution de l'app.
- Pas de nouvelle librairie de recherche floue/texte — réutiliser `trigramSimilarity` (`lib/harvester/similarity.ts`).
- Le champ "Codes ROME" manuel existant reste inchangé et fonctionnel (pas de suppression, pas de régression).
- Le référentiel (1,2 Mo) ne doit jamais être importé dans un module `"use client"` ni atteindre le bundle navigateur — uniquement chargé côté serveur (Server Action).
- Toute chaîne visible par l'utilisateur est en français, cohérente avec le reste du formulaire de campagne.

---

## Task 1: Champ `metiers` — schéma Prisma et validation Zod

**Files:**
- Modify: `prisma/schema.prisma:177-207` (modèle `Campaign`)
- Modify: `lib/harvester/campaign-validation.ts`
- Modify: `components/harvester/campaigns-manager.test.tsx:23-36` (fixture `Campaign` littérale
  cassée par le nouveau champ non-optionnel — voir Step 6)
- Test: `lib/harvester/campaign-validation.test.ts` (créer si absent)

**Interfaces:**
- Produces: `Campaign.metiers: string[]` (Prisma) ; `campaignFieldsSchema.metiers: z.ZodArray<z.ZodString>` avec défaut `[]`, consommé par `createCampaignSchema`/`updateCampaignSchema`.

- [ ] **Step 1: Ajouter le champ au modèle Prisma**

Dans `prisma/schema.prisma`, juste après la ligne `keywords     String[]` (ligne 187) :

```prisma
  romeCodes     String[]
  keywords      String[]
  // Libellés de métier choisis par l'utilisateur via la recherche assistée sur le référentiel
  // ROME (ex. "Data Analyst") — affichage uniquement (CampaignRow), pas une source de vérité
  // pour le filtrage : celui-ci reste porté par romeCodes/keywords ci-dessus, déjà branchés
  // dans l'orchestrateur. Peut diverger de romeCodes/keywords si l'utilisateur les modifie
  // ensuite manuellement — acceptable, comme `name` peut diverger de `slug`.
  metiers       String[]            @default([])
  contractTypes OfferContractType[]
```

- [ ] **Step 2: Générer la migration**

Run: `npx prisma migrate dev --name add_campaign_metiers`
Expected: une nouvelle migration créée sous `prisma/migrations/`, appliquée à la base locale sans erreur (le `@default([])` rend la migration rétrocompatible — aucune donnée existante à toucher).

- [ ] **Step 3: Ajouter `metiers` au schéma Zod**

Dans `lib/harvester/campaign-validation.ts`, dans `campaignFieldsSchema` (juste après `keywords`) :

```ts
const campaignFieldsSchema = {
  name: z.string().trim().min(1).optional(),
  romeCodes: z.array(romeCodeSchema).default([]),
  keywords: z.array(z.string().trim().min(1)).default([]),
  metiers: z.array(z.string().trim().min(1)).default([]),
  contractTypes: z.array(z.enum(CAMPAIGN_CONTRACT_TYPES)).min(1, "Au moins un type de contrat"),
  locations: z.array(campaignLocationInputSchema).min(1, "Au moins une localisation"),
  targets: HarvestTargetsSchema.optional(),
  schedule: z.string().trim().min(1).optional(),
};
```

Aucune autre modification dans ce fichier : `createCampaignSchema`/`updateCampaignSchema` héritent du champ automatiquement via `campaignFieldsSchema`.

- [ ] **Step 4: Écrire le test de validation**

Créer `lib/harvester/campaign-validation.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { createCampaignSchema } from "@/lib/harvester/campaign-validation";

describe("createCampaignSchema — metiers", () => {
  it("defaults metiers to an empty array when omitted", () => {
    const result = createCampaignSchema.safeParse({
      contractTypes: ["CDI"],
      locations: [{ label: "Paris", radiusKm: 10 }],
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.metiers).toEqual([]);
  });

  it("accepts a list of chosen métier labels", () => {
    const result = createCampaignSchema.safeParse({
      contractTypes: ["CDI"],
      locations: [{ label: "Paris", radiusKm: 10 }],
      metiers: ["Data Analyst", "Data Scientist"],
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.metiers).toEqual(["Data Analyst", "Data Scientist"]);
  });
});
```

- [ ] **Step 5: Lancer les tests**

Run: `npx vitest run lib/harvester/campaign-validation.test.ts`
Expected: 2 tests passent.

- [ ] **Step 6: Corriger la fixture `Campaign` qui casse à la compilation**

`Campaign` (type généré par Prisma) exige désormais `metiers` sur toute valeur du type
complet — seul `prisma.campaign.create()`/`update()` bénéficie du `@default([])` (champ
optionnel côté *input*). `components/harvester/campaigns-manager.test.tsx:23-36` déclare un
littéral `const campaign: Campaign = {...}` qui ne compilera plus sans ce champ. Lui ajouter
`metiers: []` :

```ts
const campaign: Campaign = {
  id: "campaign-1",
  userId: "user-1",
  slug: "alternance-data-hdf",
  name: null,
  romeCodes: ["M1403"],
  keywords: [],
  metiers: [],
  contractTypes: ["APPRENTISSAGE", "PROFESSIONNALISATION"],
  schedule: null,
  order: 0,
  config: { locations: [{ label: "Lille", lat: 50.63, lng: 3.05, radiusKm: 30 }] },
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};
```

- [ ] **Step 7: Vérifier que les tests existants n'ont pas régressé, et que tout compile**

Run: `npx tsc --noEmit`
Expected: aucune erreur (confirme qu'aucune autre fixture `Campaign` littérale n'a été
oubliée — Step 6 couvre la seule trouvée en amont de ce plan, mais le typecheck est la
garantie réelle).

Run: `npx vitest run app/actions/campaigns.test.ts components/harvester/campaign-form-dialog.test.tsx components/harvester/campaigns-manager.test.tsx`
Expected: tous les tests existants passent toujours (le nouveau champ, à `[]` partout ici,
ne change aucun comportement observé par ces tests).

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma prisma/migrations lib/harvester/campaign-validation.ts lib/harvester/campaign-validation.test.ts components/harvester/campaigns-manager.test.tsx
git commit -m "feat(harvester): ajoute Campaign.metiers (libellés de métier choisis par l'utilisateur)"
```

---

## Task 2: Script d'import du référentiel ROME

**Files:**
- Create: `scripts/import-rome-referentiel.ts`
- Create: `lib/harvester/rome-referentiel.json` (généré par le script, pas écrit à la main)
- Modify: `package.json` (nouveau script npm)

**Interfaces:**
- Produces: `lib/harvester/rome-referentiel.json` — tableau JSON `{ libelle: string; code: string }[]`, trié par `libelle`, consommé par la Task 3.

- [ ] **Step 1: Écrire le script d'import**

Créer `scripts/import-rome-referentiel.ts` :

```ts
// Script ponctuel : importe le référentiel officiel ROME 4.0 (France Travail, open data,
// licence ouverte, aucune authentification requise) et produit un fichier de correspondance
// libellé métier -> code ROME, utilisé par lib/harvester/rome-search.ts. À relancer
// manuellement au rythme des mises à jour officielles (~2x/an, cf. data.gouv.fr).
//
// Combine deux tables de la même archive : le registre des fiches métier (inclut les codes
// "émergents" comme M1405 Data scientist / M1811 Data engineer en entrées de premier rang) et
// la table des appellations courantes (qui route ces mêmes libellés vers un code "parent" plus
// large, M1403/M1802) — les deux sont conservées : une recherche floue sur "data scientist"
// doit pouvoir remonter le code le plus précis (M1405) sans perdre le plus large (M1403).
//
// Usage : npx tsx scripts/import-rome-referentiel.ts
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const OPEN_DATA_URL = "https://api.francetravail.fr/api-nomenclatureemploi/v1/open-data/json";
const OUTPUT_PATH = join(__dirname, "..", "lib", "harvester", "rome-referentiel.json");

interface AppellationRow {
  libelle: string;
  code_rome_parent: string;
}

interface CodeRomeRow {
  libelle: string;
  code_rome: string;
}

function findEntry(zipPath: string, prefix: string): string {
  const listing = execFileSync("unzip", ["-Z1", zipPath], { encoding: "utf-8" });
  const match = listing.split("\n").find((name) => name.startsWith(prefix));
  if (!match) {
    throw new Error(`Fichier ${prefix}*.json introuvable dans l'archive du référentiel ROME`);
  }
  return match;
}

function extractJson<T>(zipPath: string, entryName: string): T[] {
  const raw = execFileSync("unzip", ["-p", zipPath, entryName], { maxBuffer: 64 * 1024 * 1024 });
  // Source en windows-1252 (vérifié en inspectant l'archive) — le fichier produit ci-dessous
  // est réécrit en UTF-8 standard.
  const text = new TextDecoder("windows-1252").decode(raw);
  return JSON.parse(text) as T[];
}

async function main() {
  const response = await fetch(OPEN_DATA_URL);
  if (!response.ok) {
    throw new Error(`Téléchargement du référentiel ROME échoué : HTTP ${response.status}`);
  }
  const zipBuffer = Buffer.from(await response.arrayBuffer());

  const tmpDir = mkdtempSync(join(tmpdir(), "rome-import-"));
  const zipPath = join(tmpDir, "rome-open-data.zip");
  writeFileSync(zipPath, zipBuffer);

  try {
    const codeRomeEntry = findEntry(zipPath, "unix_referentiel_code_rome");
    const appellationEntry = findEntry(zipPath, "unix_referentiel_appellation");

    const codeRomeRows = extractJson<CodeRomeRow>(zipPath, codeRomeEntry);
    const appellationRows = extractJson<AppellationRow>(zipPath, appellationEntry);

    const combined = new Map<string, { libelle: string; code: string }>();
    for (const row of codeRomeRows) {
      const libelle = row.libelle.trim();
      combined.set(`${libelle.toLowerCase()}::${row.code_rome}`, { libelle, code: row.code_rome });
    }
    for (const row of appellationRows) {
      const libelle = row.libelle.trim();
      combined.set(`${libelle.toLowerCase()}::${row.code_rome_parent}`, {
        libelle,
        code: row.code_rome_parent,
      });
    }

    const output = Array.from(combined.values()).sort((a, b) => a.libelle.localeCompare(b.libelle, "fr"));
    writeFileSync(OUTPUT_PATH, JSON.stringify(output));
    console.log(`Référentiel ROME écrit : ${output.length} entrées -> ${OUTPUT_PATH}`);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

- [ ] **Step 2: Ajouter le script npm**

Dans `package.json`, section `scripts`, à côté de `"import-harvester-campaigns"` :

```json
    "import-rome-referentiel": "tsx scripts/import-rome-referentiel.ts",
```

- [ ] **Step 3: Exécuter le script**

Run: `npm run import-rome-referentiel`
Expected: se termine sans erreur, affiche `Référentiel ROME écrit : NNNNN entrées -> .../lib/harvester/rome-referentiel.json` avec un nombre d'entrées entre 14 000 et 17 000 (validé manuellement à ~15 700 lors de la conception — l'exact peut varier légèrement selon la version publiée au moment de l'exécution).

- [ ] **Step 4: Vérifier le contenu généré**

Run : `node -e "const d = require('./lib/harvester/rome-referentiel.json'); console.log(d.length); console.log(d.filter(r => r.libelle.toLowerCase() === 'data scientist'));"`
Expected: le tableau contient au moins une entrée `{ libelle: "Data scientist", code: "M1405" }` (le code émergent, pas seulement `M1403`).

- [ ] **Step 5: Commit**

```bash
git add scripts/import-rome-referentiel.ts lib/harvester/rome-referentiel.json package.json
git commit -m "feat(harvester): script d'import du référentiel ROME officiel"
```

---

## Task 3: Recherche floue sur le référentiel

**Files:**
- Create: `lib/harvester/rome-search.ts`
- Test: `lib/harvester/rome-search.test.ts`

**Interfaces:**
- Consumes: `trigramSimilarity(a: string, b: string): number` (`lib/harvester/similarity.ts`) ; `lib/harvester/rome-referentiel.json` (Task 2).
- Produces: `interface MetierMatch { libelle: string; romeCode: string; score: number }` ; `searchRomeReferentiel(query: string, limit?: number): MetierMatch[]` — consommé par la Task 4.

- [ ] **Step 1: Écrire les tests (échouent d'abord — le module n'existe pas encore)**

Créer `lib/harvester/rome-search.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { searchRomeReferentiel } from "@/lib/harvester/rome-search";

describe("searchRomeReferentiel", () => {
  it("returns an empty array for a query shorter than 2 characters", () => {
    expect(searchRomeReferentiel("d")).toEqual([]);
    expect(searchRomeReferentiel("")).toEqual([]);
  });

  it("finds the emerging code M1405 for 'data scientist', not only the parent M1403", () => {
    const matches = searchRomeReferentiel("data scientist");
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.some((m) => m.romeCode === "M1405")).toBe(true);
  });

  it("finds M1811 for 'data engineer'", () => {
    const matches = searchRomeReferentiel("data engineer");
    expect(matches.some((m) => m.romeCode === "M1811")).toBe(true);
  });

  it("is case- and accent-insensitive", () => {
    const lower = searchRomeReferentiel("developpeur web");
    const accented = searchRomeReferentiel("Développeur Web");
    expect(lower.length).toBeGreaterThan(0);
    expect(accented.length).toBeGreaterThan(0);
    expect(lower[0]?.libelle).toBe(accented[0]?.libelle);
  });

  it("respects the limit parameter", () => {
    const matches = searchRomeReferentiel("developpeur", 3);
    expect(matches.length).toBeLessThanOrEqual(3);
  });

  it("sorts results by descending score", () => {
    const matches = searchRomeReferentiel("data analyst");
    for (let i = 1; i < matches.length; i++) {
      expect(matches[i - 1]!.score).toBeGreaterThanOrEqual(matches[i]!.score);
    }
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run lib/harvester/rome-search.test.ts`
Expected: FAIL — `Cannot find module '@/lib/harvester/rome-search'` (ou équivalent).

- [ ] **Step 3: Implémenter la recherche floue**

Créer `lib/harvester/rome-search.ts` :

```ts
import { trigramSimilarity } from "@/lib/harvester/similarity";
import referentiel from "@/lib/harvester/rome-referentiel.json";

export interface MetierMatch {
  libelle: string;
  romeCode: string;
  score: number;
}

const MIN_QUERY_LENGTH = 2;

// Même idiome de normalisation (minuscules + suppression des diacritiques) que
// query-filter.ts (stripDiacritics) et merge.ts/company-name.ts (normalizeCompanyName) — pas
// une nouvelle règle, la troisième occurrence de ce même motif court dans lib/harvester.
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

const normalizedReferentiel = (referentiel as { libelle: string; code: string }[]).map((entry) => ({
  libelle: entry.libelle,
  romeCode: entry.code,
  normalizedLibelle: normalize(entry.libelle),
}));

export function searchRomeReferentiel(query: string, limit = 8): MetierMatch[] {
  const trimmed = query.trim();
  if (trimmed.length < MIN_QUERY_LENGTH) return [];

  const normalizedQuery = normalize(trimmed);
  const scored: MetierMatch[] = [];
  for (const entry of normalizedReferentiel) {
    const score = trigramSimilarity(normalizedQuery, entry.normalizedLibelle);
    if (score > 0) {
      scored.push({ libelle: entry.libelle, romeCode: entry.romeCode, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run lib/harvester/rome-search.test.ts`
Expected: PASS (6 tests). Si le test "M1405"/"M1811" échoue, vérifier que
`lib/harvester/rome-referentiel.json` a bien été généré par la Task 2 (Step 4 de cette
tâche) — c'est cette entrée précise qui a été spot-vérifiée pendant la conception.

- [ ] **Step 5: Commit**

```bash
git add lib/harvester/rome-search.ts lib/harvester/rome-search.test.ts
git commit -m "feat(harvester): recherche floue sur le référentiel ROME"
```

---

## Task 4: Server Action `searchMetiers`

**Files:**
- Modify: `app/actions/campaigns.ts`
- Modify: `app/actions/campaigns.test.ts`

**Interfaces:**
- Consumes: `searchRomeReferentiel(query, limit?): MetierMatch[]` (Task 3) ; `requireUser()`, `ActionResult<T>` (existants, `app/actions/_shared.ts`).
- Produces: `searchMetiers(query: string): Promise<ActionResult<{ matches: MetierMatch[] }>>` — consommé par la Task 5.

- [ ] **Step 1: Écrire les tests (échouent d'abord)**

En tête de `app/actions/campaigns.test.ts`, remplacer :

```ts
import {
  listCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  reorderCampaigns,
} from "@/app/actions/campaigns";
```

par :

```ts
import {
  listCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  reorderCampaigns,
  searchMetiers,
} from "@/app/actions/campaigns";
```

Puis ajouter un nouveau `describe` en fin de fichier :

```ts
describe("searchMetiers", () => {
  it("requires authentication", async () => {
    mockUnauthenticated();
    const result = await searchMetiers("data analyst");
    expect(result.ok).toBe(false);
  });

  it("returns matches for an authenticated user", async () => {
    mockAuthedAs("user-1");
    const result = await searchMetiers("data scientist");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.matches.length).toBeGreaterThan(0);
      expect(result.data.matches.some((m) => m.romeCode === "M1405")).toBe(true);
    }
  });

  it("returns an empty match list for a query too short to search, without erroring", async () => {
    mockAuthedAs("user-1");
    const result = await searchMetiers("d");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.matches).toEqual([]);
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run app/actions/campaigns.test.ts`
Expected: FAIL sur les 3 nouveaux tests — `searchMetiers` n'est pas exporté par
`app/actions/campaigns.ts`.

- [ ] **Step 3: Implémenter la Server Action**

Dans `app/actions/campaigns.ts`, ajouter l'import (avec les autres imports en haut du
fichier) :

```ts
import { searchRomeReferentiel, type MetierMatch } from "@/lib/harvester/rome-search";
```

Puis ajouter la fonction, après `listCampaigns` (avant `createCampaign`) :

```ts
/**
 * Recherche floue de métiers sur le référentiel ROME officiel, pour le champ "Métier
 * recherché" du formulaire de campagne — ne modifie rien, retourne des candidats que
 * l'utilisateur choisit explicitement côté client.
 *
 * @errors `UNAUTHENTICATED`.
 */
export async function searchMetiers(query: string): Promise<ActionResult<{ matches: MetierMatch[] }>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  return { ok: true, data: { matches: searchRomeReferentiel(query) } };
}
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run app/actions/campaigns.test.ts`
Expected: PASS (tous les tests du fichier, existants + 3 nouveaux).

- [ ] **Step 5: Commit**

```bash
git add app/actions/campaigns.ts app/actions/campaigns.test.ts
git commit -m "feat(harvester): Server Action searchMetiers"
```

---

## Task 5: Champ "Métier recherché" dans le formulaire de campagne

**Files:**
- Modify: `components/harvester/campaign-form-dialog.tsx`
- Modify: `components/harvester/campaign-form-dialog.test.tsx`

**Interfaces:**
- Consumes: `searchMetiers(query): Promise<ActionResult<{ matches: MetierMatch[] }>>` (Task 4) ; `MetierMatch` (Task 3) ; `ChipInput`, `Badge` (composants UI existants).
- Produces: `buildPayload()` inclut désormais `metiers: string[]` — consommé par
  `createCampaign`/`updateCampaign` (déjà génériques via `campaignFieldsSchema`, Task 1,
  aucune modification supplémentaire nécessaire dans `app/actions/campaigns.ts`).

- [ ] **Step 1: Écrire les tests (échouent d'abord)**

D'abord, en tête de `components/harvester/campaign-form-dialog.test.tsx`, remplacer :

```ts
import { createCampaign, updateCampaign, deleteCampaign } from "@/app/actions/campaigns";

vi.mock("@/app/actions/campaigns", () => ({
  createCampaign: vi.fn(),
  updateCampaign: vi.fn(),
  deleteCampaign: vi.fn(),
}));
```

par :

```ts
import { createCampaign, updateCampaign, deleteCampaign, searchMetiers } from "@/app/actions/campaigns";

vi.mock("@/app/actions/campaigns", () => ({
  createCampaign: vi.fn(),
  updateCampaign: vi.fn(),
  deleteCampaign: vi.fn(),
  searchMetiers: vi.fn(),
}));
```

Puis ajouter un nouveau `describe` en fin de fichier :

```ts
describe("CampaignFormDialog — métier recherché (recherche assistée sur le référentiel ROME)", () => {
  it("shows suggestions after typing, and selecting one adds a métier pill plus its ROME code and keyword", async () => {
    const user = userEvent.setup();
    vi.mocked(searchMetiers).mockResolvedValue({
      ok: true,
      data: { matches: [{ libelle: "Data Scientist", romeCode: "M1405", score: 0.9 }] },
    });

    render(
      <CampaignFormDialog
        campaign="new"
        onOpenChange={vi.fn()}
        onCreated={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    await user.type(screen.getByLabelText("Métier recherché"), "data scie");

    expect(await screen.findByRole("button", { name: "Data Scientist" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Data Scientist" }));

    // Deux occurrences attendues : la pastille "Métier recherché" ET le mot-clé ajouté
    // automatiquement (effet de bord de selectMetier) dans le champ "Mots-clés".
    expect(screen.getAllByText("Data Scientist")).toHaveLength(2);
    expect(screen.getByLabelText("Métier recherché")).toHaveValue("");
  });

  it("shows a clear message when nothing matches, without blocking the form", async () => {
    const user = userEvent.setup();
    vi.mocked(searchMetiers).mockResolvedValue({ ok: true, data: { matches: [] } });

    render(
      <CampaignFormDialog
        campaign="new"
        onOpenChange={vi.fn()}
        onCreated={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    await user.type(screen.getByLabelText("Métier recherché"), "xyzabc");

    expect(await screen.findByText("Aucun métier trouvé pour « xyzabc ».")).toBeInTheDocument();
  });

  it("includes selected métiers, and their ROME codes and keywords, in the created campaign payload", async () => {
    const user = userEvent.setup();
    vi.mocked(searchMetiers).mockResolvedValue({
      ok: true,
      data: { matches: [{ libelle: "Data Analyst", romeCode: "M1403", score: 0.9 }] },
    });
    vi.mocked(createCampaign).mockResolvedValue({ ok: true, data: { campaign: existingCampaign } });

    render(
      <CampaignFormDialog
        campaign="new"
        onOpenChange={vi.fn()}
        onCreated={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    await user.type(screen.getByLabelText("Métier recherché"), "data analy");
    await user.click(await screen.findByRole("button", { name: "Data Analyst" }));
    await user.click(screen.getByRole("checkbox", { name: "Apprentissage" }));
    await user.type(screen.getByLabelText("Ville"), "Lille");
    await user.click(screen.getByRole("button", { name: "Créer la campagne" }));

    expect(createCampaign).toHaveBeenCalledWith(
      expect.objectContaining({
        metiers: ["Data Analyst"],
        romeCodes: ["M1403"],
        keywords: ["Data Analyst"],
      })
    );
  });
});
```

La fixture `existingCampaign` en tête du fichier (`components/harvester/campaign-form-dialog.test.tsx:18-34`)
n'aura plus le type `Campaign` valide après la Task 1 (nouveau champ `metiers` non-optionnel
sur le type généré par Prisma) — lui ajouter `metiers: []` :

```ts
const existingCampaign: Campaign = {
  id: "campaign-1",
  userId: "user-1",
  slug: "data-analyst",
  name: "Data",
  romeCodes: ["M1403", "M1805"],
  keywords: ["data analyst"],
  metiers: [],
  contractTypes: ["APPRENTISSAGE"],
  schedule: "0 7 * * *",
  order: 0,
  config: {
    locations: [{ label: "Lille", lat: 50.630951, lng: 3.045391, radiusKm: 30 }],
    targets: { workday: [{ tenant: "valeo", site: "valeo_jobs", dc: "wd3" }], smartrecruiters: ["MAZARS"] },
  },
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run components/harvester/campaign-form-dialog.test.tsx`
Expected: FAIL sur les 3 nouveaux tests — le label "Métier recherché" n'existe pas encore.

- [ ] **Step 3: Implémenter le champ**

Dans `components/harvester/campaign-form-dialog.tsx` :

1. Ajouter les imports (avec les imports existants en haut du fichier) :

```ts
import { Badge } from "@/components/ui/badge";
import { createCampaign, updateCampaign, deleteCampaign, searchMetiers } from "@/app/actions/campaigns";
import type { MetierMatch } from "@/lib/harvester/rome-search";
```

(remplace la ligne d'import existante `import { createCampaign, updateCampaign,
deleteCampaign } from "@/app/actions/campaigns";`)

2. Ajouter la constante de debounce, avec les autres constantes en tête de fichier (après
   `ROME_CODE_PATTERN`) :

```ts
// Plus long que SEARCH_DEBOUNCE_MS (200ms, components/board/board.tsx) — celui-ci déclenche un
// appel réseau à une Server Action, pas un simple filtre en mémoire ; limite le nombre
// d'appels serveur pendant la frappe.
const METIER_SEARCH_DEBOUNCE_MS = 300;
```

3. Ajouter l'état, avec les autres `useState` du composant (après `const [romeCodes,
   setRomeCodes] = ...`) :

```ts
  const [metiers, setMetiers] = useState<string[]>(prefillSource?.metiers ?? []);
  const [metierQuery, setMetierQuery] = useState("");
  const [metierSuggestions, setMetierSuggestions] = useState<MetierMatch[]>([]);
  const [metierSearching, setMetierSearching] = useState(false);
  const [metierNotFound, setMetierNotFound] = useState<string | null>(null);
```

4. Ajouter l'effet de debounce + appel réseau, après le `useEffect` existant qui gère le
   focus de `formError` :

```ts
  useEffect(() => {
    const trimmed = metierQuery.trim();
    if (trimmed.length < 2) {
      setMetierSuggestions([]);
      setMetierNotFound(null);
      return;
    }
    const timeout = setTimeout(async () => {
      setMetierSearching(true);
      const result = await searchMetiers(trimmed);
      setMetierSearching(false);
      if (result.ok) {
        setMetierSuggestions(result.data.matches);
        setMetierNotFound(result.data.matches.length === 0 ? trimmed : null);
      }
    }, METIER_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [metierQuery]);
```

5. Ajouter les handlers, à côté de `toggleContractType` :

```ts
  function selectMetier(match: MetierMatch) {
    setMetiers((prev) => (prev.includes(match.libelle) ? prev : [...prev, match.libelle]));
    setRomeCodes((prev) => (prev.includes(match.romeCode) ? prev : [...prev, match.romeCode]));
    setKeywords((prev) =>
      prev.some((k) => k.toLowerCase() === match.libelle.toLowerCase()) ? prev : [...prev, match.libelle]
    );
    setMetierQuery("");
    setMetierSuggestions([]);
    setMetierNotFound(null);
  }

  function removeMetier(libelle: string) {
    setMetiers((prev) => prev.filter((m) => m !== libelle));
  }
```

6. Ajouter `metiers` au payload construit par `buildPayload` :

```ts
    return {
      name: name.trim() || undefined,
      keywords,
      romeCodes,
      metiers,
      contractTypes,
      locations: parsedLocations,
```

7. Ajouter le bloc JSX, dans `<div className="flex flex-col gap-4 overflow-y-auto px-1">`,
   juste **avant** le bloc existant `{/* Mots-clés */}` (celui qui commence par `<label
   htmlFor="campaign-keywords" ...>`) :

```tsx
          <div className="space-y-1.5">
            <label htmlFor="campaign-metier" className="text-base font-medium">
              Métier recherché
            </label>
            {metiers.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {metiers.map((metier) => (
                  <Badge key={metier} variant="tag" className="gap-1">
                    {metier}
                    <button
                      type="button"
                      onClick={() => removeMetier(metier)}
                      aria-label={`Retirer ${metier}`}
                      className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="relative">
              <Input
                id="campaign-metier"
                value={metierQuery}
                onChange={(e) => setMetierQuery(e.target.value)}
                onBlur={() => setTimeout(() => setMetierSuggestions([]), 150)}
                placeholder="Data Analyst, Développeur web..."
                autoComplete="off"
                disabled={saving}
              />
              {(metierSearching || metierSuggestions.length > 0 || metierNotFound) && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-popover shadow-panel">
                  {metierSearching ? (
                    <p className="p-2 text-sm text-muted-foreground">Recherche...</p>
                  ) : metierSuggestions.length > 0 ? (
                    <ul>
                      {metierSuggestions.map((match) => (
                        <li key={`${match.libelle}-${match.romeCode}`}>
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => selectMetier(match)}
                            className="block w-full px-3 py-2 text-left text-base hover:bg-muted"
                          >
                            {match.libelle}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="p-2 text-sm text-muted-foreground">
                      Aucun métier trouvé pour « {metierNotFound} ».
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

```

Note sur `onMouseDown={(e) => e.preventDefault()}` : empêche le `blur` du champ texte de se
déclencher avant le `click` sur une suggestion (sinon la liste se ferme — via le `onBlur`
ci-dessus — avant que le `onClick` n'ait eu la chance de s'exécuter) ; c'est la raison pour
laquelle `onBlur` a quand même un délai de 150ms en filet de sécurité supplémentaire.

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run components/harvester/campaign-form-dialog.test.tsx`
Expected: PASS (tous les tests du fichier, existants + 3 nouveaux).

- [ ] **Step 5: Vérifier manuellement dans le navigateur**

Avec `npm run dev` déjà lancé : ouvrir `/harvester/campaigns`, "Nouvelle campagne", taper
"data scientist" dans "Métier recherché", vérifier qu'une suggestion "Data Scientist"
apparaît, cliquer dessus, vérifier la pastille + que "Data Scientist" apparaît aussi dans
les mots-clés juste en dessous. Taper un texte absurde (ex. "zzzqxwplk") et vérifier le
message "Aucun métier trouvé".

- [ ] **Step 6: Commit**

```bash
git add components/harvester/campaign-form-dialog.tsx components/harvester/campaign-form-dialog.test.tsx
git commit -m "feat(harvester): champ Métier recherché dans le formulaire de campagne"
```

---

## Task 6: Affichage du métier sur la carte de campagne

**Files:**
- Modify: `components/harvester/campaign-row.tsx`
- Test: `components/harvester/campaign-row.test.tsx` (créer si absent)

**Interfaces:**
- Consumes: `Campaign.metiers: string[]` (Task 1).

- [ ] **Step 1: Écrire les tests (échouent d'abord — ou étoffer le fichier s'il existe déjà)**

Vérifier d'abord si `components/harvester/campaign-row.test.tsx` existe déjà :

Run: `ls components/harvester/campaign-row.test.tsx`

S'il n'existe pas, le créer avec le contenu ci-dessous. S'il existe déjà, ajouter le
`describe` ci-dessous à la suite de son contenu (garder ses imports/mocks existants, ne
pas les dupliquer).

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Campaign } from "@prisma/client";
import { CampaignRow } from "@/components/harvester/campaign-row";

function makeCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: "campaign-1",
    userId: "user-1",
    slug: "data-analyst-technique",
    name: null,
    romeCodes: [],
    keywords: [],
    metiers: [],
    contractTypes: [],
    schedule: null,
    order: 0,
    config: {},
    createdAt: new Date("2026-08-10"),
    updatedAt: new Date("2026-08-10"),
    ...overrides,
  };
}

describe("CampaignRow — libellé de métier (remplace le slug technique quand présent)", () => {
  it("shows the slug (technical, current behavior) when metiers is empty", () => {
    render(
      <CampaignRow
        campaign={makeCampaign({ name: "Ma campagne" })}
        triggering={false}
        onOpen={vi.fn()}
        onDuplicate={vi.fn()}
        onTrigger={vi.fn()}
      />
    );
    expect(screen.getByText("data-analyst-technique")).toBeInTheDocument();
  });

  it("shows the chosen métier labels instead of the slug when metiers is set", () => {
    render(
      <CampaignRow
        campaign={makeCampaign({ name: "Ma campagne", metiers: ["Data Analyst", "Data Scientist"] })}
        triggering={false}
        onOpen={vi.fn()}
        onDuplicate={vi.fn()}
        onTrigger={vi.fn()}
      />
    );
    expect(screen.getByText("Data Analyst · Data Scientist")).toBeInTheDocument();
    expect(screen.queryByText("data-analyst-technique")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run components/harvester/campaign-row.test.tsx`
Expected: FAIL sur le second test ("shows the chosen métier labels...") — le composant
affiche encore le slug dans tous les cas.

- [ ] **Step 3: Implémenter l'affichage**

Dans `components/harvester/campaign-row.tsx`, remplacer :

```tsx
        {campaign.name && (
          <span className="font-mono text-xs text-muted-foreground">{campaign.slug}</span>
        )}
```

par :

```tsx
        {campaign.metiers.length > 0 ? (
          <span className="font-mono text-xs text-muted-foreground">
            {campaign.metiers.join(" · ")}
          </span>
        ) : (
          campaign.name && (
            <span className="font-mono text-xs text-muted-foreground">{campaign.slug}</span>
          )
        )}
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run components/harvester/campaign-row.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Vérifier qu'aucun autre test de ce composant n'a régressé**

Run: `npx vitest run components/harvester/campaigns-manager.test.tsx`
Expected: PASS — ce fichier rend `CampaignRow` indirectement via `CampaignsManager`.

- [ ] **Step 6: Commit**

```bash
git add components/harvester/campaign-row.tsx components/harvester/campaign-row.test.tsx
git commit -m "feat(harvester): CampaignRow affiche les métiers choisis à la place du slug"
```

---

## Final Verification

- [ ] **Run the full test suite**

Run: `npx vitest run`
Expected: tous les tests passent (aucune régression sur le reste de l'app).

- [ ] **Typecheck**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Lint**

Run: `npx eslint app/actions/campaigns.ts components/harvester/campaign-form-dialog.tsx components/harvester/campaign-row.tsx lib/harvester/rome-search.ts lib/harvester/campaign-validation.ts scripts/import-rome-referentiel.ts`
Expected: aucune erreur (des warnings préexistants ailleurs dans le dépôt sont hors
périmètre de cette vérification).
