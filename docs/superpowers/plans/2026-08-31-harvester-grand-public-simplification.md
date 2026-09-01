# Simplification grand public du Harvester — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre le parcours Harvester (créer une recherche automatique → collecter → trier les offres) exploitable par un public non technique, sans toucher aux identifiants/routes/modèles Prisma existants.

**Architecture:** Six changements incrémentaux et testés isolément : (1) un composant générique `ChipInput`, (2) son branchement sur le champ mots-clés, (3) un dictionnaire de libellés de source, (4) la refonte de la file de revue en liste de cartes (qui adopte déjà le nouveau vocabulaire pour ses deux actions), (5) l'ajout d'un filtre par campagne sur cette même liste, (6) la traduction du vocabulaire technique restant (nav, onglets, titres de page, formulaire de campagne, cartes bento). L'ordre suit les dépendances explicites des tickets Linear (147→148, 152→154) et évite de retravailler deux fois la zone de filtres de la file de revue.

**Tech Stack:** Next.js (App Router, Server Components + Server Actions), React 19 (`"use client"`), Prisma, Tailwind (design system du repo : `Badge`, `Button`, `Select` sur base-ui), Vitest + Testing Library + `@testing-library/user-event`.

**Spec:** Tickets Linear JOB-147, JOB-148, JOB-150, JOB-152, JOB-154, JOB-149 (équipe Job-harvester, projet "Fusion job-harvester → job-board-mvp"). Lot validé avec l'utilisateur : ces 6 tickets seulement — JOB-151 (sélection auto des connecteurs, cron→langage naturel) et JOB-153 (devenir de l'onglet "Cibles découvertes") restent hors périmètre, aucune décision produit bloquante à trancher ici.

## Global Constraints

- Ne jamais changer les identifiants techniques : routes (`/harvester/*`), noms de Server Actions (`importHarvestedOffer`, `triggerCampaignCollection`, ...), noms de modèles/champs Prisma (`Campaign`, `HarvestedOffer.campaignId`, ...). Seul le texte affiché change (JOB-149 AC).
- Échelle typographique du CLAUDE.md : labels de formulaire `text-base font-medium`, corps de texte `text-base text-muted-foreground`, meta `text-sm text-muted-foreground`, pastilles `gap-1.5` + `rounded-full`/`rounded-4xl` (Badge existant).
- Espacements : `gap-1.5` pour une rangée de pastilles, `p-3` pour une carte/ligne de liste, `space-y-1.5` pour une pile de champs de formulaire.
- Aucune régression a11y : chaque bouton de suppression de pastille reste focusable avec `aria-label="Retirer {valeur}"` ; navigation clavier complète (Entrée/virgule pour ajouter, Backspace sur champ vide pour retirer la dernière pastille).
- Réutiliser les composants existants plutôt qu'en réinventer : `Badge variant="tag"`, `Button` (`variant`/`size` déjà définis dans `components/ui/button.tsx`), `Select`/`SelectTrigger`/`SelectContent`/`SelectItem` (`components/ui/select.tsx`), le pattern de pastille de filtre à bascule de `components/board/board.tsx:267-290`, le pattern de sentinelle de valeur (`CONTRACT_TYPE_NONE` dans `components/board/job-dialog.tsx:56`) pour tout `Select` ayant besoin d'une option "Tous".
- Tests : Vitest + Testing Library déjà en place (`vi.mock`, `userEvent.setup()`), conventions déjà suivies dans les fichiers `*.test.tsx` du dossier — les nouveaux tests doivent suivre le même style (pas de nouveaux mocks globaux).

---

## Task 1: Composant générique `ChipInput` (JOB-147)

**Files:**
- Create: `components/ui/chip-input.tsx`
- Test: `components/ui/chip-input.test.tsx`

**Interfaces:**
- Produces: `ChipInput({ id?, values, onChange, placeholder?, disabled?, className?, "aria-label"? })` où `values: string[]`, `onChange: (values: string[]) => void`. Consommé par Task 2 (`components/harvester/campaign-form-dialog.tsx`).

- [ ] **Step 1: Écrire les tests (échouent, le composant n'existe pas encore)**

```tsx
// components/ui/chip-input.test.tsx
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChipInput } from "@/components/ui/chip-input";

function Controlled({
  initial = [],
  placeholder,
}: {
  initial?: string[];
  placeholder?: string;
}) {
  const [values, setValues] = useState<string[]>(initial);
  return (
    <ChipInput
      id="test-chips"
      aria-label="Mots-clés"
      values={values}
      onChange={setValues}
      placeholder={placeholder}
    />
  );
}

describe("ChipInput", () => {
  it("adds a value as a chip on Enter and clears the draft input", async () => {
    const user = userEvent.setup();
    render(<Controlled />);

    await user.type(screen.getByRole("textbox"), "data analyst{Enter}");

    expect(screen.getByText("data analyst")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveValue("");
  });

  it("adds a value as a chip on comma", async () => {
    const user = userEvent.setup();
    render(<Controlled />);

    await user.type(screen.getByRole("textbox"), "data analyst,");

    expect(screen.getByText("data analyst")).toBeInTheDocument();
  });

  it("adds the current draft as a chip on blur", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Controlled />
        <button type="button">Ailleurs</button>
      </>
    );

    await user.type(screen.getByRole("textbox"), "BI");
    await user.click(screen.getByRole("button", { name: "Ailleurs" }));

    expect(screen.getByText("BI")).toBeInTheDocument();
  });

  it("trims whitespace and never adds an empty value", async () => {
    const user = userEvent.setup();
    render(<Controlled />);

    await user.type(screen.getByRole("textbox"), "  data analyst  {Enter}");
    await user.type(screen.getByRole("textbox"), "   {Enter}");

    expect(screen.getByText("data analyst")).toBeInTheDocument();
    expect(screen.getAllByText(/^data analyst$/)).toHaveLength(1);
  });

  it("silently ignores a case-insensitive duplicate", async () => {
    const user = userEvent.setup();
    render(<Controlled />);

    await user.type(screen.getByRole("textbox"), "Data Analyst{Enter}");
    await user.type(screen.getByRole("textbox"), "data analyst{Enter}");

    expect(screen.getAllByText(/data analyst/i)).toHaveLength(1);
  });

  it("removes a single chip by clicking its remove button, keeping the others", async () => {
    const user = userEvent.setup();
    render(<Controlled initial={["data analyst", "BI"]} />);

    await user.click(screen.getByRole("button", { name: "Retirer data analyst" }));

    expect(screen.queryByText("data analyst")).not.toBeInTheDocument();
    expect(screen.getByText("BI")).toBeInTheDocument();
  });

  it("removes the remove button's chip via keyboard (Tab + Enter/Space)", async () => {
    const user = userEvent.setup();
    render(<Controlled initial={["data analyst"]} />);

    await user.tab(); // focus the remove button (only focusable element besides the text input)
    await user.keyboard("{Enter}");

    expect(screen.queryByText("data analyst")).not.toBeInTheDocument();
  });

  it("removes the last chip on Backspace when the draft input is empty", async () => {
    const user = userEvent.setup();
    render(<Controlled initial={["data analyst", "BI"]} />);

    await user.click(screen.getByRole("textbox"));
    await user.keyboard("{Backspace}");

    expect(screen.queryByText("BI")).not.toBeInTheDocument();
    expect(screen.getByText("data analyst")).toBeInTheDocument();
  });

  it("does not remove a chip on Backspace while the draft input has text", async () => {
    const user = userEvent.setup();
    render(<Controlled initial={["data analyst"]} />);

    await user.type(screen.getByRole("textbox"), "x{Backspace}");

    expect(screen.getByText("data analyst")).toBeInTheDocument();
  });

  it("shows the placeholder only when there are no chips yet", () => {
    render(<Controlled placeholder="data analyst, BI" />);
    expect(screen.getByPlaceholderText("data analyst, BI")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Lancer les tests, vérifier qu'ils échouent**

Run: `npx vitest run components/ui/chip-input.test.tsx`
Expected: FAIL — `Cannot find module '@/components/ui/chip-input'`

- [ ] **Step 3: Implémenter le composant**

```tsx
// components/ui/chip-input.tsx
"use client";

import { useState, type FocusEvent, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ChipInputProps {
  id?: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

function addValue(values: string[], raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return values;
  const isDuplicate = values.some((v) => v.toLowerCase() === trimmed.toLowerCase());
  if (isDuplicate) return values;
  return [...values, trimmed];
}

// Pastilles + champ de saisie libre (JOB-147) — remplace un `Input` texte à
// valeurs séparées par virgules (ex. mots-clés de campagne), parsé
// uniquement au submit. Ici chaque valeur devient visible et retirable
// individuellement dès son ajout, sans attendre l'enregistrement du
// formulaire parent.
export function ChipInput({
  id,
  values,
  onChange,
  placeholder,
  disabled,
  className,
  ...ariaProps
}: ChipInputProps) {
  const [draft, setDraft] = useState("");

  function commitDraft() {
    const next = addValue(values, draft);
    if (next !== values) onChange(next);
    setDraft("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commitDraft();
      return;
    }
    if (event.key === "Backspace" && draft === "" && values.length > 0) {
      event.preventDefault();
      onChange(values.slice(0, -1));
    }
  }

  function handleBlur(_event: FocusEvent<HTMLInputElement>) {
    if (draft.trim()) commitDraft();
  }

  return (
    <div
      className={cn(
        "flex min-h-8 w-full flex-wrap items-center gap-1.5 rounded-lg border border-input bg-transparent px-2.5 py-1 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
        disabled && "pointer-events-none opacity-50",
        className
      )}
    >
      {values.map((value) => (
        <Badge key={value} variant="tag" className="gap-1">
          {value}
          <button
            type="button"
            onClick={() => onChange(values.filter((v) => v !== value))}
            aria-label={`Retirer ${value}`}
            className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <X className="size-3" />
          </button>
        </Badge>
      ))}
      <input
        id={id}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={values.length === 0 ? placeholder : undefined}
        disabled={disabled}
        className="min-w-24 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground md:text-sm"
        {...ariaProps}
      />
    </div>
  );
}
```

- [ ] **Step 4: Lancer les tests, vérifier qu'ils passent**

Run: `npx vitest run components/ui/chip-input.test.tsx`
Expected: PASS (10 tests)

- [ ] **Step 5: Commit**

```bash
git add components/ui/chip-input.tsx components/ui/chip-input.test.tsx
git commit -m "feat(ui): composant ChipInput réutilisable (JOB-147)"
```

---

## Task 2: Brancher `ChipInput` sur le champ "Mots-clés" du formulaire de campagne (JOB-148)

**Files:**
- Modify: `components/harvester/campaign-form-dialog.tsx`
- Modify (tests): `components/harvester/campaign-form-dialog.test.tsx`

**Interfaces:**
- Consumes: `ChipInput` (Task 1).

- [ ] **Step 1: Ajouter les tests qui échouent encore (préremplissage + suppression individuelle en édition)**

Ajouter dans `components/harvester/campaign-form-dialog.test.tsx`, dans le describe `"CampaignFormDialog — édition"` :

```tsx
  it("pre-fills a chip per existing keyword (JOB-148)", () => {
    render(
      <CampaignFormDialog
        campaign={{ ...existingCampaign, keywords: ["data analyst", "BI"] }}
        onOpenChange={vi.fn()}
        onCreated={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    expect(screen.getByText("data analyst")).toBeInTheDocument();
    expect(screen.getByText("BI")).toBeInTheDocument();
  });

  it("removes a single keyword chip without touching the others, then saves the trimmed list", async () => {
    const user = userEvent.setup();
    vi.mocked(updateCampaign).mockResolvedValue({ ok: true, data: { campaign: existingCampaign } });

    render(
      <CampaignFormDialog
        campaign={{ ...existingCampaign, keywords: ["data analyst", "BI"] }}
        onOpenChange={vi.fn()}
        onCreated={vi.fn()}
        onUpdated={vi.fn()}
        onDeleted={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "Retirer BI" }));
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(updateCampaign).toHaveBeenCalledWith(
      expect.objectContaining({ keywords: ["data analyst"] })
    );
  });
```

- [ ] **Step 2: Lancer les tests, vérifier qu'ils échouent**

Run: `npx vitest run components/harvester/campaign-form-dialog.test.tsx -t "JOB-148"`
Expected: FAIL — aucune pastille rendue (le champ est toujours un `Input` texte brut)

- [ ] **Step 3: Modifier `campaign-form-dialog.tsx`**

Ajouter l'import (après l'import de `Input`) :

```tsx
import { ChipInput } from "@/components/ui/chip-input";
```

Remplacer la ligne d'état (ligne 95) :

```tsx
  const [keywords, setKeywords] = useState((existing?.keywords ?? []).join(", "));
```

par :

```tsx
  const [keywords, setKeywords] = useState<string[]>(existing?.keywords ?? []);
```

Remplacer le bloc JSX du champ mots-clés (lignes 225-236) :

```tsx
          <div className="space-y-1.5">
            <label htmlFor="campaign-keywords" className="text-base font-medium">
              Mots-clés
            </label>
            <Input
              id="campaign-keywords"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="data analyst, BI"
              disabled={saving}
            />
          </div>
```

par :

```tsx
          <div className="space-y-1.5">
            <label htmlFor="campaign-keywords" className="text-base font-medium">
              Mots-clés
            </label>
            <ChipInput
              id="campaign-keywords"
              values={keywords}
              onChange={setKeywords}
              placeholder="data analyst, BI"
              disabled={saving}
            />
          </div>
```

Dans `buildPayload()`, remplacer :

```tsx
      keywords: splitCommaList(keywords),
```

par :

```tsx
      keywords,
```

`ChipInput` trim et dédoublonne déjà à l'ajout — aucune transformation supplémentaire nécessaire ici.

- [ ] **Step 4: Lancer toute la suite de tests du fichier, vérifier qu'elle passe**

Run: `npx vitest run components/harvester/campaign-form-dialog.test.tsx`
Expected: PASS (tous les tests existants + les 2 nouveaux) — les tests existants qui tapent des mots-clés avec virgule (`"développeur web, full-stack"`) continuent de fonctionner : la virgule commit la pastille précédente, le dernier segment est commité au blur déclenché par le clic sur le bouton de soumission.

- [ ] **Step 5: Commit**

```bash
git add components/harvester/campaign-form-dialog.tsx components/harvester/campaign-form-dialog.test.tsx
git commit -m "feat(harvester): remplacer le champ Mots-clés par des pastilles (JOB-148)"
```

---

## Task 3: Dictionnaire de libellés lisibles pour les sources/connecteurs (JOB-150)

**Files:**
- Create: `lib/harvester/source-labels.ts`
- Test: `lib/harvester/source-labels.test.ts`

**Interfaces:**
- Produces: `SOURCE_LABELS: Record<string, string>`, `getSourceLabel(source: string): string`. Consommé par Task 4 (`components/harvester/review-queue-manager.tsx`).

- [ ] **Step 1: Écrire le test (échoue, le module n'existe pas)**

```ts
// lib/harvester/source-labels.test.ts
import { describe, expect, it } from "vitest";
import { getSourceLabel, SOURCE_LABELS } from "@/lib/harvester/source-labels";

describe("getSourceLabel", () => {
  it("maps every registered connector id to a human-readable label", () => {
    expect(getSourceLabel("francetravail")).toBe("France Travail");
    expect(getSourceLabel("labonnealternance")).toBe("La Bonne Alternance");
    expect(getSourceLabel("workday")).toBe("Workday");
    expect(getSourceLabel("smartrecruiters")).toBe("SmartRecruiters");
    expect(getSourceLabel("talentsoft")).toBe("Talentsoft");
    expect(getSourceLabel("digitalrecruiters")).toBe("DigitalRecruiters");
    expect(getSourceLabel("welcometothejungle")).toBe("Welcome to the Jungle");
  });

  it("falls back to the raw source code for an unknown source", () => {
    expect(getSourceLabel("unknown-connector")).toBe("unknown-connector");
  });

  it("keeps every SOURCE_LABELS entry non-empty", () => {
    for (const label of Object.values(SOURCE_LABELS)) {
      expect(label.trim().length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Lancer le test, vérifier qu'il échoue**

Run: `npx vitest run lib/harvester/source-labels.test.ts`
Expected: FAIL — `Cannot find module '@/lib/harvester/source-labels'`

- [ ] **Step 3: Implémenter le module**

```ts
// lib/harvester/source-labels.ts
// Connecteurs internes (lib/harvester/connectors/index.ts, champ `id`) → libellés
// lisibles pour l'utilisateur — même principe que CAMPAIGN_CONTRACT_TYPE_LABELS
// (campaign-validation.ts) et REMOTE_POLICY_LABELS (lib/search/offers.ts) :
// jamais le code brut du connecteur affiché tel quel à l'utilisateur (JOB-150).
export const SOURCE_LABELS: Record<string, string> = {
  francetravail: "France Travail",
  labonnealternance: "La Bonne Alternance",
  workday: "Workday",
  smartrecruiters: "SmartRecruiters",
  talentsoft: "Talentsoft",
  digitalrecruiters: "DigitalRecruiters",
  welcometothejungle: "Welcome to the Jungle",
};

export function getSourceLabel(source: string): string {
  return SOURCE_LABELS[source] ?? source;
}
```

- [ ] **Step 4: Lancer le test, vérifier qu'il passe**

Run: `npx vitest run lib/harvester/source-labels.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/harvester/source-labels.ts lib/harvester/source-labels.test.ts
git commit -m "feat(harvester): dictionnaire de libellés lisibles pour les sources (JOB-150)"
```

---

## Task 4: Refondre la file de revue en liste de cartes (JOB-152)

**Files:**
- Modify: `components/harvester/review-queue-manager.tsx`
- Modify (réécriture partielle): `components/harvester/review-queue-manager.test.tsx`

**Interfaces:**
- Consumes: `getSourceLabel` (Task 3), `Select`/`SelectTrigger`/`SelectContent`/`SelectItem` (`components/ui/select.tsx`), `CAMPAIGN_CONTRACT_TYPE_LABELS` (`lib/harvester/campaign-validation.ts`, inchangé), `importHarvestedOffer`/`ignoreHarvestedOffer` (`app/actions/harvest.ts`, inchangés).
- Produces: `ReviewQueueManager({ initialOffers, nextCursor })` — signature de props inchangée dans cette tâche (Task 5 y ajoutera `campaigns`). Les deux actions par carte utilisent déjà le nouveau vocabulaire ("Ajouter à mon suivi" / "Passer", JOB-149) puisque ce ticket le demande explicitement dans son propre périmètre — évite de retoucher ce fichier une troisième fois en Task 6.

- [ ] **Step 1: Réécrire les tests pour la structure en cartes (remplace le fichier de tests existant)**

```tsx
// components/harvester/review-queue-manager.test.tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { HarvestedOffer } from "@prisma/client";
import { ReviewQueueManager } from "@/components/harvester/review-queue-manager";
import { importHarvestedOffer, ignoreHarvestedOffer } from "@/app/actions/harvest";

vi.mock("@/app/actions/harvest", () => ({
  importHarvestedOffer: vi.fn(),
  ignoreHarvestedOffer: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const { useLinkStatusMock } = vi.hoisted(() => ({
  useLinkStatusMock: vi.fn(() => ({ pending: false })),
}));

vi.mock("next/link", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/link")>();
  return {
    ...actual,
    useLinkStatus: useLinkStatusMock,
  };
});

function makeOffer(overrides: Partial<HarvestedOffer> = {}): HarvestedOffer {
  return {
    id: "offer-1",
    userId: "user-1",
    campaignId: "campaign-1",
    source: "smartrecruiters",
    sourceOfferId: "1",
    originSource: null,
    canonicalUrl: "https://example.com/jobs/1",
    applyUrl: "https://example.com/apply/1",
    title: "Data Analyst",
    companyName: "Acme",
    companyNormalizedName: "acme",
    companySiret: null,
    companyWebsite: null,
    locationLabel: "Lille",
    city: "Lille",
    postalCode: null,
    department: null,
    lat: null,
    lng: null,
    contractType: "APPRENTISSAGE",
    durationMonths: null,
    startDate: null,
    romeCodes: [],
    descriptionText: "desc",
    descriptionHtml: null,
    salary: null,
    remotePolicy: null,
    postedAt: "2026-08-01",
    expiresAt: null,
    firstSeenAt: new Date("2026-08-10"),
    lastSeenAt: new Date("2026-08-10"),
    lifecycle: "ACTIVE",
    dedupKey: "dedup-1",
    sourceRefs: [],
    rawPayload: {},
    importedJobId: null,
    ignoredAt: null,
    createdAt: new Date("2026-08-10"),
    updatedAt: new Date("2026-08-10"),
    ...overrides,
  };
}

beforeEach(() => {
  vi.mocked(importHarvestedOffer).mockReset();
  vi.mocked(ignoreHarvestedOffer).mockReset();
  useLinkStatusMock.mockReset();
  useLinkStatusMock.mockReturnValue({ pending: false });
});

describe("ReviewQueueManager", () => {
  it("shows a positive, never-buggy-looking empty state when there are no offers (JOB-115)", () => {
    render(<ReviewQueueManager initialOffers={[]} nextCursor={null} />);
    const emptyState = screen.getByTestId("review-queue-empty-state");
    expect(emptyState).toHaveTextContent(/tout est à jour/i);
  });

  it("uses body-text size (16px, JOB-87) for the empty-state message", () => {
    render(<ReviewQueueManager initialOffers={[]} nextCursor={null} />);
    const message = screen.getByText(/aucune offre n.attend votre revue/i);
    expect(message.className).toMatch(/\btext-base\b/);
  });

  it("lists offers with title, company, city and a readable source label", () => {
    render(<ReviewQueueManager initialOffers={[makeOffer()]} nextCursor={null} />);
    expect(screen.getByRole("link", { name: "Data Analyst" })).toHaveAttribute(
      "href",
      "https://example.com/apply/1"
    );
    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(screen.getByText("Lille")).toBeInTheDocument();
    expect(screen.getByText("SmartRecruiters")).toBeInTheDocument();
    expect(screen.queryByText("smartrecruiters")).not.toBeInTheDocument();
  });

  it("falls back to the raw code for an unregistered source", () => {
    render(<ReviewQueueManager initialOffers={[makeOffer({ source: "mystere" })]} nextCursor={null} />);
    expect(screen.getByText("mystere")).toBeInTheDocument();
  });

  it("adds an offer to the user's tracker and shows a success toast (JOB-149 vocabulary)", async () => {
    const user = userEvent.setup();
    vi.mocked(importHarvestedOffer).mockResolvedValue({ ok: true, data: { jobId: "job-1" } });
    render(<ReviewQueueManager initialOffers={[makeOffer()]} nextCursor={null} />);

    await user.click(screen.getByRole("button", { name: "Ajouter à mon suivi" }));

    expect(importHarvestedOffer).toHaveBeenCalledWith({ offerId: "offer-1" });
    expect(await screen.findByText(/[Tt]out est à jour/)).toBeInTheDocument();
  });

  it("removes an offer from the list after passing on it, without a success toast", async () => {
    const user = userEvent.setup();
    vi.mocked(ignoreHarvestedOffer).mockResolvedValue({ ok: true, data: null });
    render(<ReviewQueueManager initialOffers={[makeOffer()]} nextCursor={null} />);

    await user.click(screen.getByRole("button", { name: "Passer" }));

    expect(ignoreHarvestedOffer).toHaveBeenCalledWith({ offerId: "offer-1" });
    expect(await screen.findByText(/[Tt]out est à jour/)).toBeInTheDocument();
  });

  it("keeps the offer in the list and shows an error toast when adding to the tracker fails", async () => {
    const user = userEvent.setup();
    vi.mocked(importHarvestedOffer).mockResolvedValue({
      ok: false,
      error: "Impossible d'importer cette offre",
      code: "INTERNAL_ERROR",
    });
    render(<ReviewQueueManager initialOffers={[makeOffer()]} nextCursor={null} />);

    await user.click(screen.getByRole("button", { name: "Ajouter à mon suivi" }));

    expect(screen.getByText("Data Analyst")).toBeInTheDocument();
  });

  it("filters the list by city", async () => {
    const user = userEvent.setup();
    const offers = [makeOffer({ id: "o1", city: "Lille" }), makeOffer({ id: "o2", city: "Paris", title: "Dev web" })];
    render(<ReviewQueueManager initialOffers={offers} nextCursor={null} />);

    await user.type(screen.getByLabelText("Filtrer par ville"), "Paris");

    expect(screen.queryByText("Data Analyst")).not.toBeInTheDocument();
    expect(screen.getByText("Dev web")).toBeInTheDocument();
  });

  it("filters the list by contract type using the design-system Select", async () => {
    const user = userEvent.setup();
    const offers = [
      makeOffer({ id: "o1", contractType: "APPRENTISSAGE" }),
      makeOffer({ id: "o2", contractType: "STAGE", title: "Stagiaire data" }),
    ];
    render(<ReviewQueueManager initialOffers={offers} nextCursor={null} />);

    await user.click(screen.getByRole("combobox", { name: "Filtrer par type de contrat" }));
    await user.click(await screen.findByRole("option", { name: "Stage" }));

    expect(screen.queryByText("Data Analyst")).not.toBeInTheDocument();
    expect(screen.getByText("Stagiaire data")).toBeInTheDocument();
  });

  it("has no table/row semantics and no selection checkboxes left (JOB-152)", () => {
    render(<ReviewQueueManager initialOffers={[makeOffer()]} nextCursor={null} />);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByRole("row")).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("shows a next-page link with the given cursor", () => {
    render(<ReviewQueueManager initialOffers={[makeOffer()]} nextCursor="offer-25" />);
    expect(screen.getByRole("button", { name: "Page suivante" })).toHaveAttribute(
      "href",
      "/harvester/review?cursor=offer-25"
    );
  });

  it("does not render a next-page link when there is none", () => {
    render(<ReviewQueueManager initialOffers={[makeOffer()]} nextCursor={null} />);
    expect(screen.queryByRole("button", { name: "Page suivante" })).not.toBeInTheDocument();
  });

  it("renders the tracker action as the positive accent button, same height as Passer (JOB-100)", () => {
    render(<ReviewQueueManager initialOffers={[makeOffer()]} nextCursor={null} />);
    const importButton = screen.getByRole("button", { name: "Ajouter à mon suivi" });
    const ignoreButton = screen.getByRole("button", { name: "Passer" });
    expect(importButton.className).toMatch(/bg-brand-positive/);
    expect(importButton.className).toMatch(/\bh-11\b/);
    expect(ignoreButton.className).toMatch(/\bh-11\b/);
  });

  it("signals interactivity on hover on each offer card (JOB-114)", () => {
    render(<ReviewQueueManager initialOffers={[makeOffer()]} nextCursor={null} />);
    const card = screen.getByText("Data Analyst").closest("li");
    expect(card?.className).toMatch(/hover:bg-muted/);
  });

  describe("loading state while navigating to the next page (JOB-117)", () => {
    it("keeps the real offer cards and an enabled next-page button when no navigation is pending", () => {
      useLinkStatusMock.mockReturnValue({ pending: false });
      render(<ReviewQueueManager initialOffers={[makeOffer()]} nextCursor="offer-25" />);

      expect(screen.getByText("Data Analyst")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Page suivante" })).not.toBeDisabled();
    });

    it("replaces the offer cards with skeletons and disables the CTA while the next page is loading", () => {
      useLinkStatusMock.mockReturnValue({ pending: true });
      render(<ReviewQueueManager initialOffers={[makeOffer()]} nextCursor="offer-25" />);

      expect(screen.queryByText("Data Analyst")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Page suivante" })).toHaveAttribute(
        "aria-disabled",
        "true"
      );
    });

    it("marks the offer list as busy for assistive tech while the next page is loading", () => {
      useLinkStatusMock.mockReturnValue({ pending: true });
      render(<ReviewQueueManager initialOffers={[makeOffer()]} nextCursor="offer-25" />);

      expect(screen.getByRole("list", { name: /offres collectées/i })).toHaveAttribute(
        "aria-busy",
        "true"
      );
    });

    it("does not show a busy state when there is no next page", () => {
      useLinkStatusMock.mockReturnValue({ pending: false });
      render(<ReviewQueueManager initialOffers={[makeOffer()]} nextCursor={null} />);

      expect(screen.getByRole("list", { name: /offres collectées/i })).toHaveAttribute(
        "aria-busy",
        "false"
      );
    });

    it("with a key change from the parent, shows the new page's offers and clears the loading indicator", () => {
      useLinkStatusMock.mockReturnValue({ pending: true });
      const { rerender } = render(
        <ReviewQueueManager
          key="page-1"
          initialOffers={[makeOffer({ id: "o1", title: "Data Analyst" })]}
          nextCursor="offer-25"
        />
      );

      useLinkStatusMock.mockReturnValue({ pending: false });
      rerender(
        <ReviewQueueManager
          key="page-2"
          initialOffers={[makeOffer({ id: "o2", title: "Dev Web" })]}
          nextCursor={null}
        />
      );

      expect(screen.getByText("Dev Web")).toBeInTheDocument();
      expect(screen.queryByText("Data Analyst")).not.toBeInTheDocument();
      expect(screen.getByRole("list", { name: /offres collectées/i })).toHaveAttribute(
        "aria-busy",
        "false"
      );
    });
  });
});
```

- [ ] **Step 2: Lancer les tests, vérifier qu'ils échouent**

Run: `npx vitest run components/harvester/review-queue-manager.test.tsx`
Expected: FAIL — la structure actuelle est encore un tableau avec sélection groupée, `Select`/base-ui n'est pas encore utilisé, les libellés "Importer"/"Ignorer" ne matchent plus les nouveaux noms de bouton.

- [ ] **Step 3: Réécrire `review-queue-manager.tsx`**

```tsx
// components/harvester/review-queue-manager.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link, { useLinkStatus } from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import type { HarvestedOffer } from "@prisma/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { importHarvestedOffer, ignoreHarvestedOffer } from "@/app/actions/harvest";
import { CAMPAIGN_CONTRACT_TYPE_LABELS } from "@/lib/harvester/campaign-validation";
import { getSourceLabel } from "@/lib/harvester/source-labels";

// Sentinelle de "pas de filtre" pour le Select (base-ui n'admet pas une
// SelectItem à valeur vide) — même pattern que CONTRACT_TYPE_NONE dans
// components/board/job-dialog.tsx.
const CONTRACT_TYPE_ALL = "ALL";

function formatDate(value: string | null): string {
  return value ? value.slice(0, 10) : "—";
}

// JOB-117 : "Page suivante" est un vrai <Link> Next.js (navigation App
// Router vers /harvester/review?cursor=..., pas un fetch client) avec déjà
// prefetch={false} — exactement le cas d'usage documenté pour useLinkStatus.
// Ce hook ne peut être appelé que dans un descendant du <Link> lui-même
// (ici, un enfant du Button rendu comme Link) : ce petit composant le lit et
// remonte l'état "pending" au parent, qui affiche des cartes squelettes à sa
// place le temps que le nouveau payload RSC arrive.
function NextPagePendingBridge({ onPendingChange }: { onPendingChange: (pending: boolean) => void }) {
  const { pending } = useLinkStatus();
  useEffect(() => {
    onPendingChange(pending);
  }, [pending, onPendingChange]);
  return null;
}

function ReviewQueueCardSkeleton() {
  return (
    <li aria-hidden="true" className="flex flex-col gap-3 rounded-xl border border-border p-3 md:flex-row md:items-center md:justify-between md:gap-4">
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton shape="line" className="h-4 w-40 max-w-full" />
        <Skeleton shape="line" className="h-3.5 w-56 max-w-full" />
        <Skeleton shape="rect" className="h-5 w-24 rounded-full" />
      </div>
      <span className="flex gap-1.5">
        <Skeleton shape="rect" className="h-11 w-full flex-1 md:w-32 md:flex-none" />
        <Skeleton shape="rect" className="h-11 w-full flex-1 md:w-20 md:flex-none" />
      </span>
    </li>
  );
}

export function ReviewQueueManager({
  initialOffers,
  nextCursor,
}: {
  initialOffers: HarvestedOffer[];
  nextCursor: string | null;
}) {
  const [offers, setOffers] = useState(initialOffers);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [city, setCity] = useState("");
  const [contractType, setContractType] = useState(CONTRACT_TYPE_ALL);
  const [search, setSearch] = useState("");
  // JOB-117 : reflète le useLinkStatus du lien "Page suivante" — voir
  // NextPagePendingBridge plus haut.
  const [isPaginating, setIsPaginating] = useState(false);

  const filteredOffers = useMemo(() => {
    return offers.filter((offer) => {
      if (city && !offer.city.toLowerCase().includes(city.toLowerCase())) return false;
      if (contractType !== CONTRACT_TYPE_ALL && offer.contractType !== contractType) return false;
      if (search) {
        const haystack = `${offer.title} ${offer.companyName}`.toLowerCase();
        if (!haystack.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [offers, city, contractType, search]);

  function removeOffer(id: string) {
    setOffers((prev) => prev.filter((o) => o.id !== id));
  }

  function withPending<T>(id: string, fn: () => Promise<T>): Promise<T> {
    setPendingIds((prev) => new Set(prev).add(id));
    return fn().finally(() => {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    });
  }

  async function handleImport(id: string) {
    const result = await withPending(id, () => importHarvestedOffer({ offerId: id }));
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    removeOffer(id);
    toast.success("Offre ajoutée à votre suivi");
  }

  async function handleIgnore(id: string) {
    const result = await withPending(id, () => ignoreHarvestedOffer({ offerId: id }));
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    removeOffer(id);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Input
          aria-label="Filtrer par ville"
          placeholder="Ville..."
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="w-40"
        />
        <Select value={contractType} onValueChange={(value) => setContractType(value ?? CONTRACT_TYPE_ALL)}>
          <SelectTrigger aria-label="Filtrer par type de contrat" className="!h-11 w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={CONTRACT_TYPE_ALL}>Tous les contrats</SelectItem>
            {Object.entries(CAMPAIGN_CONTRACT_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          aria-label="Rechercher un titre ou une entreprise"
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-48"
        />
      </div>

      {filteredOffers.length === 0 ? (
        offers.length === 0 ? (
          <div
            data-testid="review-queue-empty-state"
            className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border p-8 text-center"
          >
            <p className="flex items-center gap-2 font-heading text-lg text-heading">
              <CheckCircle2 aria-hidden="true" className="size-5 text-brand-positive" />
              Tout est à jour
            </p>
            <p className="max-w-md text-base text-muted-foreground">
              Aucune offre n&apos;attend votre revue pour le moment. Revenez
              après la prochaine recherche, ou lancez-en une manuellement
              depuis vos alertes.
            </p>
          </div>
        ) : (
          <p className="text-base text-muted-foreground">
            Aucune offre ne correspond à ces filtres.
          </p>
        )
      ) : (
        <ul
          aria-label="Offres collectées"
          aria-busy={isPaginating}
          className="space-y-2"
        >
          {isPaginating
            ? filteredOffers.map((offer) => <ReviewQueueCardSkeleton key={offer.id} />)
            : filteredOffers.map((offer) => {
                const pending = pendingIds.has(offer.id);
                const sourceLabel = offer.originSource
                  ? `${getSourceLabel(offer.originSource)} (${getSourceLabel(offer.source)})`
                  : getSourceLabel(offer.source);
                return (
                  <li
                    key={offer.id}
                    className="flex flex-col gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-muted/50 md:flex-row md:items-center md:justify-between md:gap-4"
                  >
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <a
                        href={offer.applyUrl ?? offer.canonicalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-heading text-base leading-snug text-heading underline-offset-2 hover:underline"
                      >
                        {offer.title}
                      </a>
                      <p className="text-sm text-muted-foreground">
                        {offer.companyName} · {offer.city} · {formatDate(offer.postedAt)}
                      </p>
                      <Badge variant="tag">{sourceLabel}</Badge>
                    </div>
                    <span className="flex gap-1.5">
                      <Button
                        size="sm"
                        variant="accent"
                        disabled={pending}
                        onClick={() => handleImport(offer.id)}
                        className="flex-1 md:flex-none"
                      >
                        {pending && <Loader2 className="animate-spin" />}
                        Ajouter à mon suivi
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => handleIgnore(offer.id)}
                        className="flex-1 md:flex-none"
                      >
                        Passer
                      </Button>
                    </span>
                  </li>
                );
              })}
        </ul>
      )}

      {nextCursor && (
        <Button
          render={<Link href={`/harvester/review?cursor=${nextCursor}`} prefetch={false} />}
          nativeButton={false}
          variant="outline"
          disabled={isPaginating}
        >
          {isPaginating && <Loader2 className="animate-spin" aria-hidden="true" />}
          Page suivante
          <NextPagePendingBridge onPendingChange={setIsPaginating} />
        </Button>
      )}
    </div>
  );
}
```

Notes d'implémentation :
- `!h-11` (important) sur `SelectTrigger` : la classe par défaut du composant (`data-[size=default]:h-8`) a une spécificité CSS supérieure à une simple classe `h-11` ajoutée via `className` (sélecteur combiné classe+attribut vs. classe seule) — sans `!`, l'override ne prend pas visuellement.
- Le message d'empty state remplace "lancez-en une manuellement depuis les campagnes" par "lancez-en une manuellement depuis vos alertes" — anticipe le vocabulaire de Task 6 dans ce fichier déjà réécrit, pour ne pas le retoucher une seconde fois.

- [ ] **Step 4: Lancer les tests, vérifier qu'ils passent**

Run: `npx vitest run components/harvester/review-queue-manager.test.tsx`
Expected: PASS (tous les tests)

- [ ] **Step 5: Commit**

```bash
git add components/harvester/review-queue-manager.tsx components/harvester/review-queue-manager.test.tsx
git commit -m "refactor(harvester): file de revue en liste de cartes, sans sélection groupée (JOB-152)"
```

---

## Task 5: Filtre par campagne dans la file de revue (JOB-154)

**Files:**
- Modify: `app/harvester/review/page.tsx`
- Modify: `components/harvester/review-queue-manager.tsx`
- Modify (tests): `components/harvester/review-queue-manager.test.tsx`

**Interfaces:**
- Consumes: `HarvestedOffer.campaignId` (déjà un champ scalaire du modèle Prisma, `prisma/schema.prisma:209` — aucun `include` nécessaire côté offres).
- Produces: `ReviewQueueManager({ initialOffers, nextCursor, campaigns })` où `campaigns: { id: string; name: string | null; slug: string }[]` (nouvelle prop, défaut `[]` pour ne pas casser les appels existants dans les tests de Task 4).

- [ ] **Step 1: Ajouter les tests qui échouent (filtre par campagne)**

Ajouter dans `components/harvester/review-queue-manager.test.tsx` (avant la dernière accolade du `describe("ReviewQueueManager", ...)`) :

```tsx
  describe("filtre par campagne (JOB-154)", () => {
    const campaigns = [
      { id: "campaign-1", name: "Data Lille", slug: "data-lille" },
      { id: "campaign-2", name: null, slug: "dev-paris" },
    ];

    it("does not show a campaign pill row when the user has a single campaign", () => {
      render(
        <ReviewQueueManager
          initialOffers={[makeOffer()]}
          nextCursor={null}
          campaigns={[campaigns[0]!]}
        />
      );
      expect(screen.queryByRole("button", { name: "Data Lille" })).not.toBeInTheDocument();
    });

    it("shows one pill per campaign when the user has 2 or more", () => {
      render(<ReviewQueueManager initialOffers={[makeOffer()]} nextCursor={null} campaigns={campaigns} />);
      expect(screen.getByRole("button", { name: "Data Lille" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "dev-paris" })).toBeInTheDocument();
    });

    it("filters offers to a single selected campaign", async () => {
      const user = userEvent.setup();
      const offers = [
        makeOffer({ id: "o1", campaignId: "campaign-1" }),
        makeOffer({ id: "o2", campaignId: "campaign-2", title: "Dev web" }),
      ];
      render(<ReviewQueueManager initialOffers={offers} nextCursor={null} campaigns={campaigns} />);

      await user.click(screen.getByRole("button", { name: "Data Lille" }));

      expect(screen.getByText("Data Analyst")).toBeInTheDocument();
      expect(screen.queryByText("Dev web")).not.toBeInTheDocument();
    });

    it("selecting multiple campaign pills unions their offers", async () => {
      const user = userEvent.setup();
      const offers = [
        makeOffer({ id: "o1", campaignId: "campaign-1" }),
        makeOffer({ id: "o2", campaignId: "campaign-2", title: "Dev web" }),
      ];
      render(<ReviewQueueManager initialOffers={offers} nextCursor={null} campaigns={campaigns} />);

      await user.click(screen.getByRole("button", { name: "Data Lille" }));
      await user.click(screen.getByRole("button", { name: "dev-paris" }));

      expect(screen.getByText("Data Analyst")).toBeInTheDocument();
      expect(screen.getByText("Dev web")).toBeInTheDocument();
    });

    it("combines the campaign filter (OR within category) with the city filter (AND across categories)", async () => {
      const user = userEvent.setup();
      const offers = [
        makeOffer({ id: "o1", campaignId: "campaign-1", city: "Lille" }),
        makeOffer({ id: "o2", campaignId: "campaign-1", city: "Paris", title: "Dev Lille bis" }),
      ];
      render(<ReviewQueueManager initialOffers={offers} nextCursor={null} campaigns={campaigns} />);

      await user.click(screen.getByRole("button", { name: "Data Lille" }));
      await user.type(screen.getByLabelText("Filtrer par ville"), "Paris");

      expect(screen.queryByText("Data Analyst")).not.toBeInTheDocument();
      expect(screen.getByText("Dev Lille bis")).toBeInTheDocument();
    });
  });
```

- [ ] **Step 2: Lancer les tests, vérifier qu'ils échouent**

Run: `npx vitest run components/harvester/review-queue-manager.test.tsx -t "JOB-154"`
Expected: FAIL — la prop `campaigns` n'existe pas encore, aucune pastille rendue.

- [ ] **Step 3: Modifier `review-queue-manager.tsx`**

Ajouter l'import de `cn` (utilisé pour le style de pastille sélectionnée, comme `board.tsx`) :

```tsx
import { cn } from "@/lib/utils";
```

Changer la signature du composant :

```tsx
export function ReviewQueueManager({
  initialOffers,
  nextCursor,
  campaigns = [],
}: {
  initialOffers: HarvestedOffer[];
  nextCursor: string | null;
  campaigns?: { id: string; name: string | null; slug: string }[];
}) {
```

Ajouter l'état de sélection (avec les autres `useState`) :

```tsx
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<Set<string>>(new Set());
```

Étendre `filteredOffers` (ajouter la condition dans le `filter`, avant le `return true` final) :

```tsx
      if (selectedCampaignIds.size > 0 && !selectedCampaignIds.has(offer.campaignId)) return false;
```

et ajouter `selectedCampaignIds` aux dépendances du `useMemo`.

Ajouter la rangée de pastilles juste avant le bloc `{filteredOffers.length === 0 ? (` — pattern repris de `components/board/board.tsx:267-290` :

```tsx
      {campaigns.length >= 2 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {campaigns.map((campaign) => {
            const selected = selectedCampaignIds.has(campaign.id);
            return (
              <Button
                key={campaign.id}
                type="button"
                variant={selected ? "default" : "outline"}
                size="xs"
                onClick={() =>
                  setSelectedCampaignIds((prev) => {
                    const next = new Set(prev);
                    if (selected) next.delete(campaign.id);
                    else next.add(campaign.id);
                    return next;
                  })
                }
              >
                {campaign.name ?? campaign.slug}
              </Button>
            );
          })}
        </div>
      )}
```

(`cn` n'est en fait pas nécessaire ici — la pastille utilise déjà `variant`, pas de classe conditionnelle supplémentaire ; ne pas ajouter l'import si non utilisé ailleurs dans le fichier.)

- [ ] **Step 4: Modifier `app/harvester/review/page.tsx`**

Remplacer le `Promise.all` (lignes 19-33) :

```tsx
  const [offersPage, connectorRuns, pendingOfferCount, discoveredTargetCount] = await Promise.all([
    prisma.harvestedOffer.findMany({
      where: { userId, importedJobId: null, ignoredAt: null },
      orderBy: { firstSeenAt: "desc" },
      take: PAGE_SIZE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    }),
    prisma.connectorRun.findMany({
      where: { campaign: { userId } },
      distinct: ["connectorId"],
      orderBy: { startedAt: "desc" },
    }),
    getPendingOfferCount(userId),
    getPendingDiscoveredTargetCount(userId),
  ]);
```

par :

```tsx
  const [offersPage, connectorRuns, pendingOfferCount, discoveredTargetCount, campaigns] = await Promise.all([
    prisma.harvestedOffer.findMany({
      where: { userId, importedJobId: null, ignoredAt: null },
      orderBy: { firstSeenAt: "desc" },
      take: PAGE_SIZE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    }),
    prisma.connectorRun.findMany({
      where: { campaign: { userId } },
      distinct: ["connectorId"],
      orderBy: { startedAt: "desc" },
    }),
    getPendingOfferCount(userId),
    getPendingDiscoveredTargetCount(userId),
    prisma.campaign.findMany({
      where: { userId },
      select: { id: true, name: true, slug: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);
```

Passer la nouvelle prop au composant (dernière ligne du JSX) :

```tsx
      <ReviewQueueManager key={cursor ?? "first-page"} initialOffers={offers} nextCursor={nextCursor} campaigns={campaigns} />
```

- [ ] **Step 5: Lancer les tests, vérifier qu'ils passent**

Run: `npx vitest run components/harvester/review-queue-manager.test.tsx`
Expected: PASS (tous les tests, y compris les 5 nouveaux du describe JOB-154)

- [ ] **Step 6: Commit**

```bash
git add app/harvester/review/page.tsx components/harvester/review-queue-manager.tsx components/harvester/review-queue-manager.test.tsx
git commit -m "feat(harvester): filtre par campagne dans la file de revue (JOB-154)"
```

---

## Task 6: Traduire le vocabulaire technique restant en langage grand public (JOB-149)

**Files:**
- Modify: `components/nav.tsx`, `components/nav.test.tsx`
- Modify: `components/harvester/harvester-tabs.tsx`, `components/harvester/harvester-tabs.test.tsx`
- Modify: `app/harvester/page.tsx`
- Modify: `app/harvester/campaigns/page.tsx`
- Modify: `app/harvester/review/page.tsx`
- Modify: `components/harvester/campaigns-manager.tsx`, `components/harvester/campaigns-manager.test.tsx`
- Modify: `components/harvester/campaign-form-dialog.tsx`, `components/harvester/campaign-form-dialog.test.tsx`
- Modify: `components/harvester/about-card.tsx`, `components/harvester/about-card.test.tsx`
- Modify: `components/harvester/review-queue-card.tsx`, `components/harvester/review-queue-card.test.tsx`
- Modify: `components/harvester/campaigns-card.tsx`, `components/harvester/campaigns-card.test.tsx`

**Interfaces:** aucune signature de fonction/composant ne change dans cette tâche — uniquement du texte affiché (JSX, chaînes de toast). `app/harvester/discovery/page.tsx` et l'onglet "Cibles découvertes" restent inchangés (hors périmètre, JOB-153).

Lexique validé (à documenter tel quel, cf. AC "lexique de correspondance ... documenté") :

| Ancien terme | Nouveau terme |
|---|---|
| Harvester (nav, titres de page) | Alertes emploi (nav : "Alertes") |
| Campagne(s) | Alerte(s) |
| Lancer la collecte | Chercher des offres |
| File de revue | Nouvelles offres |
| Importer / "vers le board" | Ajouter à mon suivi *(déjà fait en Task 4)* |
| Ignorer (action sur une offre) | Passer *(déjà fait en Task 4)* |
| Collecte (mot générique : "offres collectées", "Collecte automatisée") | recherche / trouvée(s) |

- [ ] **Step 1: Mettre à jour tous les tests qui vérifient l'ancien vocabulaire (échouent contre le code actuel, pas encore modifié)**

`components/nav.test.tsx`, remplacer la ligne 354 :

```tsx
    for (const name of ["Board", "Analytics", "Harvester"]) {
```

par :

```tsx
    for (const name of ["Board", "Analytics", "Alertes"]) {
```

`components/harvester/harvester-tabs.test.tsx`, remplacer toutes les occurrences textuelles :
- `"Campagnes"` → `"Alertes"` (lignes 18, 24)
- `"File de revue"` → `"Nouvelles offres"` (lignes 19, 30, 36, 37, 42) — y compris les regex `/File de revue/`.

`components/harvester/campaigns-manager.test.tsx` :
- `/Aucune campagne pour le moment/` → `/Aucune alerte pour le moment/` (lignes 40, 86, 100)
- `/nouvelle campagne/i` → `/nouvelle alerte/i` (lignes 59, 80)
- `"Nouvelle campagne"` (heading) → `"Nouvelle alerte"` (ligne 61)
- `"Modifier la campagne"` → `"Modifier l'alerte"` (lignes 70, 115)
- `"Créer la campagne"` → `"Créer l'alerte"` (ligne 83)
- `"Lancer la collecte"` → `"Chercher des offres"` (lignes 111, 131)

`components/harvester/campaign-form-dialog.test.tsx` : remplacer chaque occurrence de
- `"Nouvelle campagne"` → `"Nouvelle alerte"`
- `"Modifier la campagne"` → `"Modifier l'alerte"`
- `"Créer la campagne"` → `"Créer l'alerte"`

(toutes les occurrences dans le fichier, y compris les noms de tests `it("renders as a dialog with a create title", ...)` qui asserte `screen.getByText("Nouvelle campagne")`, et le describe `"CampaignFormDialog — création"` reste inchangé — seul le texte affiché change, pas les noms de describe/it).

`components/harvester/about-card.test.tsx`, remplacer :

```tsx
    expect(screen.getByText("Collecte automatisée d'offres")).toBeInTheDocument();
    const card = screen.getByText("Collecte automatisée d'offres").closest('[data-slot="bento-card"]');
```

par :

```tsx
    expect(screen.getByText("Trouvez des offres automatiquement")).toBeInTheDocument();
    const card = screen.getByText("Trouvez des offres automatiquement").closest('[data-slot="bento-card"]');
```

`components/harvester/review-queue-card.test.tsx`, remplacer `/voir la file de revue/i` par `/voir les nouvelles offres/i`.

`components/harvester/campaigns-card.test.tsx`, remplacer `/créer une campagne/i` → `/créer une alerte/i` et `/gérer les campagnes/i` → `/gérer mes alertes/i`.

- [ ] **Step 2: Lancer toute la suite de tests des fichiers listés ci-dessus, vérifier qu'elle échoue**

Run: `npx vitest run components/nav.test.tsx components/harvester/harvester-tabs.test.tsx components/harvester/campaigns-manager.test.tsx components/harvester/campaign-form-dialog.test.tsx components/harvester/about-card.test.tsx components/harvester/review-queue-card.test.tsx components/harvester/campaigns-card.test.tsx`
Expected: FAIL sur toutes les assertions listées ci-dessus (le code source n'a pas encore changé).

- [ ] **Step 3: Modifier `components/nav.tsx`**

Dans le tableau `LINKS` :

```tsx
  { href: "/harvester", label: "Harvester", prefetch: false },
```

devient :

```tsx
  { href: "/harvester", label: "Alertes", prefetch: false },
```

- [ ] **Step 4: Modifier `components/harvester/harvester-tabs.tsx`**

Dans le tableau `TABS` :

```tsx
const TABS = [
  { href: "/harvester", label: "Vue d'ensemble" },
  { href: "/harvester/campaigns", label: "Campagnes" },
  { href: "/harvester/review", label: "File de revue" },
  { href: "/harvester/discovery", label: "Cibles découvertes" },
] as const;
```

devient :

```tsx
const TABS = [
  { href: "/harvester", label: "Vue d'ensemble" },
  { href: "/harvester/campaigns", label: "Alertes" },
  { href: "/harvester/review", label: "Nouvelles offres" },
  { href: "/harvester/discovery", label: "Cibles découvertes" },
] as const;
```

- [ ] **Step 5: Modifier `app/harvester/page.tsx`**

```tsx
      <PageHeader
        eyebrow="Collecte automatisée"
        title="Harvester"
        subtitle="Campagnes de recherche et offres collectées en attente de revue."
      />
```

devient :

```tsx
      <PageHeader
        eyebrow="Alertes emploi"
        title="Vue d'ensemble"
        subtitle="Alertes actives et nouvelles offres en attente."
      />
```

- [ ] **Step 6: Modifier `app/harvester/campaigns/page.tsx`**

```tsx
      <PageHeader
        eyebrow="Harvester"
        title="Campagnes"
        subtitle="Mots-clés, zones géographiques et types de contrat visés par chaque collecte."
      />
```

devient :

```tsx
      <PageHeader
        eyebrow="Alertes emploi"
        title="Alertes"
        subtitle="Mots-clés, zones géographiques et types de contrat visés par chaque alerte."
      />
```

- [ ] **Step 7: Modifier `app/harvester/review/page.tsx`**

```tsx
      <PageHeader
        eyebrow="Harvester"
        title="File de revue"
        subtitle="Offres collectées non encore traitées — importez-les vers le board ou ignorez-les."
      />
```

devient :

```tsx
      <PageHeader
        eyebrow="Alertes emploi"
        title="Nouvelles offres"
        subtitle="Offres trouvées par vos alertes — ajoutez-les à votre suivi ou passez."
      />
```

- [ ] **Step 8: Modifier `components/harvester/campaigns-manager.tsx`**

```tsx
      <Button onClick={() => setSelected("new")}>
        <Plus className="size-3.5" />
        Nouvelle campagne
      </Button>

      {campaigns.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucune campagne pour le moment — créez-en une pour commencer à collecter des offres.
        </p>
```

devient :

```tsx
      <Button onClick={() => setSelected("new")}>
        <Plus className="size-3.5" />
        Nouvelle alerte
      </Button>

      {campaigns.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucune alerte pour le moment — créez-en une pour commencer à recevoir des offres.
        </p>
```

```tsx
                {triggeringId === campaign.id ? <Loader2 className="animate-spin" /> : <Play className="size-3.5" />}
                Lancer la collecte
```

devient :

```tsx
                {triggeringId === campaign.id ? <Loader2 className="animate-spin" /> : <Play className="size-3.5" />}
                Chercher des offres
```

Dans `handleTrigger`, les deux messages de toast :

```tsx
      toast.success(
        offersCollected > 0
          ? `${offersCollected} offre${offersCollected > 1 ? "s" : ""} collectée${offersCollected > 1 ? "s" : ""}`
          : "Collecte terminée, aucune nouvelle offre"
      );
```

devient :

```tsx
      toast.success(
        offersCollected > 0
          ? `${offersCollected} offre${offersCollected > 1 ? "s" : ""} trouvée${offersCollected > 1 ? "s" : ""}`
          : "Recherche terminée, aucune nouvelle offre"
      );
```

- [ ] **Step 9: Modifier `components/harvester/campaign-form-dialog.tsx`**

```tsx
          <DialogTitle>{isNew ? "Nouvelle campagne" : "Modifier la campagne"}</DialogTitle>
          <DialogDescription>
            Mots-clés, zones géographiques et types de contrat visés par cette collecte.
          </DialogDescription>
```

devient :

```tsx
          <DialogTitle>{isNew ? "Nouvelle alerte" : "Modifier l'alerte"}</DialogTitle>
          <DialogDescription>
            Mots-clés, zones géographiques et types de contrat visés par cette alerte.
          </DialogDescription>
```

Dans `handleSave` :

```tsx
    if (isNew) {
      onCreated(result.data.campaign);
      toast.success("Campagne créée");
    } else {
      onUpdated(result.data.campaign);
      toast.success("Campagne mise à jour");
    }
```

devient :

```tsx
    if (isNew) {
      onCreated(result.data.campaign);
      toast.success("Alerte créée");
    } else {
      onUpdated(result.data.campaign);
      toast.success("Alerte mise à jour");
    }
```

Dans `handleDelete` :

```tsx
    onDeleted(existing.id);
    toast.success("Campagne supprimée");
```

devient :

```tsx
    onDeleted(existing.id);
    toast.success("Alerte supprimée");
```

Le bloc de suppression dans le JSX :

```tsx
              title="Supprimer cette campagne ?"
              description={`La campagne "${existing?.slug}" et les offres déjà collectées associées seront définitivement supprimées.`}
```

devient :

```tsx
              title="Supprimer cette alerte ?"
              description={`L'alerte "${existing?.slug}" et les offres déjà trouvées associées seront définitivement supprimées.`}
```

Le bouton de soumission :

```tsx
            {isNew ? "Créer la campagne" : "Enregistrer"}
```

devient :

```tsx
            {isNew ? "Créer l'alerte" : "Enregistrer"}
```

- [ ] **Step 10: Modifier `components/harvester/about-card.tsx`**

```tsx
    <BentoCard span="2x1" tone="muted" label="Harvester" title="Collecte automatisée d'offres">
      <p>
        Configurez des campagnes (mots-clés, zones, types de contrat) pour collecter des offres
        depuis France Travail, La Bonne Alternance, Workday et SmartRecruiters, puis importez
        celles qui vous intéressent directement dans votre board.
      </p>
    </BentoCard>
```

devient :

```tsx
    <BentoCard span="2x1" tone="muted" label="Alertes emploi" title="Trouvez des offres automatiquement">
      <p>
        Créez des alertes (mots-clés, zones, types de contrat) pour trouver des offres depuis
        France Travail, La Bonne Alternance, Workday et SmartRecruiters, puis ajoutez à votre
        suivi celles qui vous intéressent directement depuis votre board.
      </p>
    </BentoCard>
```

- [ ] **Step 11: Modifier `components/harvester/review-queue-card.tsx`**

```tsx
    <BentoCard span="1x2" tone="accent" label="À traiter" title="File de revue">
      <div className="flex h-full flex-col gap-3">
        {pendingCount > 0 ? (
          <p>
            <span className="font-heading text-2xl text-white">{pendingCount}</span> offre
            {pendingCount > 1 ? "s" : ""} collectée{pendingCount > 1 ? "s" : ""} en attente
            d&apos;import.
          </p>
        ) : (
          <p data-testid="review-queue-empty">
            Aucune offre en attente — lancez une collecte depuis une campagne pour en trouver.
          </p>
        )}
        <Button
          render={<Link href="/harvester/review" prefetch={false} />}
          nativeButton={false}
          size="sm"
          className="mt-auto self-start"
        >
          Voir la file de revue
        </Button>
```

devient :

```tsx
    <BentoCard span="1x2" tone="accent" label="À traiter" title="Nouvelles offres">
      <div className="flex h-full flex-col gap-3">
        {pendingCount > 0 ? (
          <p>
            <span className="font-heading text-2xl text-white">{pendingCount}</span> offre
            {pendingCount > 1 ? "s" : ""} trouvée{pendingCount > 1 ? "s" : ""} en attente.
          </p>
        ) : (
          <p data-testid="review-queue-empty">
            Aucune offre en attente — lancez une recherche depuis une alerte pour en trouver.
          </p>
        )}
        <Button
          render={<Link href="/harvester/review" prefetch={false} />}
          nativeButton={false}
          size="sm"
          className="mt-auto self-start"
        >
          Voir les nouvelles offres
        </Button>
```

- [ ] **Step 12: Modifier `components/harvester/campaigns-card.tsx`**

```tsx
    <BentoCard span="1x2" tone="dark" label="Collecte" title="Campagnes">
      <div className="flex h-full flex-col gap-3">
        {count > 0 ? (
          <p>
            <span className="font-heading text-2xl text-white">{count}</span>{" "}
            campagne{count > 1 ? "s" : ""} configurée{count > 1 ? "s" : ""}.
          </p>
        ) : (
          <p data-testid="campaigns-empty">
            Aucune campagne pour le moment — configurez des mots-clés, zones et types de
            contrat pour lancer une première collecte.
          </p>
        )}
        <Button
          render={<Link href="/harvester/campaigns" prefetch={false} />}
          nativeButton={false}
          size="sm"
          className="mt-auto self-start"
        >
          {count > 0 ? "Gérer les campagnes" : "Créer une campagne"}
        </Button>
```

devient :

```tsx
    <BentoCard span="1x2" tone="dark" label="Recherche" title="Alertes">
      <div className="flex h-full flex-col gap-3">
        {count > 0 ? (
          <p>
            <span className="font-heading text-2xl text-white">{count}</span>{" "}
            alerte{count > 1 ? "s" : ""} active{count > 1 ? "s" : ""}.
          </p>
        ) : (
          <p data-testid="campaigns-empty">
            Aucune alerte pour le moment — configurez des mots-clés, zones et types de
            contrat pour lancer une première recherche.
          </p>
        )}
        <Button
          render={<Link href="/harvester/campaigns" prefetch={false} />}
          nativeButton={false}
          size="sm"
          className="mt-auto self-start"
        >
          {count > 0 ? "Gérer mes alertes" : "Créer une alerte"}
        </Button>
```

- [ ] **Step 13: Lancer toute la suite de tests touchée, vérifier qu'elle passe**

Run: `npx vitest run components/nav.test.tsx components/harvester/harvester-tabs.test.tsx components/harvester/campaigns-manager.test.tsx components/harvester/campaign-form-dialog.test.tsx components/harvester/about-card.test.tsx components/harvester/review-queue-card.test.tsx components/harvester/campaigns-card.test.tsx components/harvester/review-queue-manager.test.tsx`
Expected: PASS (toute la suite, y compris les fichiers déjà modifiés en Tasks 2/4/5)

- [ ] **Step 14: Recherche exhaustive de résidus de l'ancien vocabulaire dans l'UI visible du Harvester (hors discovery, hors identifiants techniques)**

Run:
```bash
grep -rn '"Harvester"\|>Campagne\|Lancer la collecte\|File de revue\|>Importer<\|collectée' \
  components/harvester app/harvester components/nav.tsx \
  --include="*.tsx" | grep -v '\.test\.tsx' | grep -v 'app/harvester/discovery'
```
Expected: aucune occurrence restante (en dehors de noms de variables/fonctions techniques comme `campaignId`, `Campaign` en tant que type Prisma, ou commentaires de code — non visibles utilisateur, hors AC).

- [ ] **Step 15: Commit**

```bash
git add components/nav.tsx components/nav.test.tsx \
  components/harvester/harvester-tabs.tsx components/harvester/harvester-tabs.test.tsx \
  app/harvester/page.tsx app/harvester/campaigns/page.tsx app/harvester/review/page.tsx \
  components/harvester/campaigns-manager.tsx components/harvester/campaigns-manager.test.tsx \
  components/harvester/campaign-form-dialog.tsx components/harvester/campaign-form-dialog.test.tsx \
  components/harvester/about-card.tsx components/harvester/about-card.test.tsx \
  components/harvester/review-queue-card.tsx components/harvester/review-queue-card.test.tsx \
  components/harvester/campaigns-card.tsx components/harvester/campaigns-card.test.tsx
git commit -m "feat(harvester): traduire le vocabulaire technique en langage grand public (JOB-149)"
```

---

## Vérification finale (toutes tâches terminées)

- [ ] Lancer la suite complète : `npx vitest run`
- [ ] Lancer le typecheck : `npx tsc --noEmit`
- [ ] Lancer le lint : `npm run lint` (ou équivalent défini dans `package.json`)
- [ ] `graphify update .` pour resynchroniser le graphe de connaissance avec les fichiers modifiés/créés.
