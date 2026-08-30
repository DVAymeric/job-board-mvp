# Découverte automatique de cibles connecteurs — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sonder automatiquement, après une collecte manuelle, si les entreprises déjà vues dans les offres d'un utilisateur publient aussi sur Workday/SmartRecruiters/Talentsoft/DigitalRecruiters, et laisser l'utilisateur approuver ou rejeter chaque cible trouvée avant qu'elle ne s'ajoute à ses campagnes.

**Architecture:** Un orchestrateur pur (`discoverTargets`) dérive les entreprises candidates des `HarvestedOffer` de l'utilisateur, sonde les 4 plateformes via des fonctions indépendantes et testables (`probe-*.ts`), écrit chaque résultat dans un cache global `DiscoveryProbe` (jamais re-sondé), et crée une ligne `DiscoveredTarget` (PENDING) par hit pour l'utilisateur déclencheur. Câblé dans `triggerCampaignCollection` en best-effort (une erreur de découverte ne fait jamais échouer la collecte). Une nouvelle page `/harvester/discovery` liste les cibles PENDING avec Approuver/Rejeter — plus simple que `ReviewQueueManager` (pas de pagination/filtres/actions groupées, liste naturellement bornée à 20 candidats × 4 plateformes par run).

**Tech Stack:** Prisma (postgresql), Next.js Server Actions, Vitest (`.test.ts` unitaires mockés, `.integration.test.ts` contre Postgres local), React Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-30-decouverte-cibles-connecteurs-design.md`

## Global Constraints

- Cache de sondage (`DiscoveryProbe`) **global, sans `userId`** — fait public sur l'infrastructure d'une entreprise, jamais de donnée utilisateur dedans.
- File de revue (`DiscoveredTarget`) **scopée par `userId`**, comme tout le reste du harvester.
- Plafond fixe de 20 nouvelles entreprises sondées par run (non configurable).
- Toute sonde qui lève une exception (timeout/réseau) **n'écrit rien** dans `DiscoveryProbe` — la paire (entreprise, plateforme) reste éligible à un nouvel essai.
- Approbation ajoute la cible à `config.targets` de **toutes** les campagnes de l'utilisateur (pas de sélection).
- Déclenchement **uniquement** après une collecte manuelle (`triggerCampaignCollection`) — jamais dans le cron.
- Une erreur pendant la découverte est journalée mais **ne doit jamais** faire échouer ni ralentir la réponse de `triggerCampaignCollection`.
- Timeout de 10s par requête de sonde (`AbortSignal.timeout(10_000)`), réutilise `createRateLimitedFetch` et `USER_AGENT` déjà existants.

---

## Task 1: Schéma Prisma — `DiscoveryProbe` et `DiscoveredTarget`

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_discovery_models/migration.sql` (générée par `prisma migrate dev`, pas écrite à la main)
- Create: `lib/harvester/discovery-schema.integration.test.ts`

**Interfaces:**
- Produces: enums Prisma `DiscoveryPlatform { WORKDAY SMARTRECRUITERS TALENTSOFT DIGITALRECRUITERS }`, `DiscoveredTargetStatus { PENDING ADDED REJECTED }` ; modèles `DiscoveryProbe { id, companySlug: String, platform: DiscoveryPlatform, found: Boolean, target: Json?, probedAt: DateTime }` (`@@unique([companySlug, platform])`) et `DiscoveredTarget { id, userId, companySlug, companyName, platform, target: Json, status: DiscoveredTargetStatus, discoveredAt, reviewedAt: DateTime? }` (`@@unique([userId, companySlug, platform])`, `@@index([userId, status])`).
- Consumes: `User.id` existant.

- [ ] **Step 1: Écrire le test qui échoue**

```typescript
// lib/harvester/discovery-schema.integration.test.ts
import { describe, expect, it, afterAll, beforeAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";

const prisma = new PrismaClient();
let userId: string;

beforeAll(async () => {
  const user = await prisma.user.create({
    data: { email: `discovery-schema-test-${randomUUID()}@example.com`, passwordHash: "test-hash" },
  });
  userId = user.id;
});

afterAll(async () => {
  await prisma.user.delete({ where: { id: userId } });
  await prisma.$disconnect();
});

describe("DiscoveryProbe / DiscoveredTarget schema", () => {
  it("writes a global probe not scoped to any user, unique per (companySlug, platform)", async () => {
    const probe = await prisma.discoveryProbe.create({
      data: { companySlug: "acme", platform: "WORKDAY", found: true, target: { tenant: "acme", site: "acme_jobs", dc: "wd3" } },
    });

    await expect(
      prisma.discoveryProbe.create({ data: { companySlug: "acme", platform: "WORKDAY", found: false, target: null } })
    ).rejects.toThrow();

    await prisma.discoveryProbe.delete({ where: { id: probe.id } });
  });

  it("creates a DiscoveredTarget scoped to a user, unique per (userId, companySlug, platform)", async () => {
    const target = await prisma.discoveredTarget.create({
      data: {
        userId,
        companySlug: "acme",
        companyName: "Acme Corp",
        platform: "SMARTRECRUITERS",
        target: "ACME",
      },
    });

    expect(target.status).toBe("PENDING");

    await expect(
      prisma.discoveredTarget.create({
        data: { userId, companySlug: "acme", companyName: "Acme Corp", platform: "SMARTRECRUITERS", target: "ACME" },
      })
    ).rejects.toThrow();

    const found = await prisma.discoveredTarget.findUnique({ where: { id: target.id } });
    expect(found?.userId).toBe(userId);

    await prisma.discoveredTarget.delete({ where: { id: target.id } });
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run lib/harvester/discovery-schema.integration.test.ts`
Expected: FAIL — `Property 'discoveryProbe' does not exist on type 'PrismaClient'`

- [ ] **Step 3: Ajouter les enums et modèles à `prisma/schema.prisma`**

Ajouter à la fin du fichier :

```prisma
enum DiscoveryPlatform {
  WORKDAY
  SMARTRECRUITERS
  TALENTSOFT
  DIGITALRECRUITERS
}

enum DiscoveredTargetStatus {
  PENDING
  ADDED
  REJECTED
}

// Cache global de sondage, volontairement PAS scopé par userId : ne contient que des faits
// publics et vérifiables sur l'infrastructure de recrutement d'entreprises réelles (ex.
// "capgemini.com utilise myworkdayjobs.com"), jamais de donnée utilisateur. Partagé entre tous
// les comptes pour éviter de re-sonder en direct la même entreprise pour chacun d'eux.
model DiscoveryProbe {
  id          String            @id @default(uuid())
  companySlug String
  platform    DiscoveryPlatform
  found       Boolean
  // string (domaine) pour SmartRecruiters/Talentsoft/DigitalRecruiters, { tenant, site, dc }
  // pour Workday. Toujours null si found=false.
  target      Json?
  probedAt    DateTime          @default(now())

  @@unique([companySlug, platform])
}

// File de revue par utilisateur : une cible trouvée par le sondage global doit être approuvée
// avant de rejoindre config.targets des campagnes de CET utilisateur.
model DiscoveredTarget {
  id           String                 @id @default(uuid())
  userId       String
  user         User                   @relation(fields: [userId], references: [id], onDelete: Cascade)
  companySlug  String
  companyName  String
  platform     DiscoveryPlatform
  target       Json
  status       DiscoveredTargetStatus @default(PENDING)
  discoveredAt DateTime               @default(now())
  reviewedAt   DateTime?

  @@unique([userId, companySlug, platform])
  @@index([userId, status])
}
```

Ajouter la relation inverse dans `model User` (après `harvestedOffers HarvestedOffer[]`) :
`discoveredTargets DiscoveredTarget[]`

- [ ] **Step 4: Générer et appliquer la migration**

Run: `set -a; source .env; set +a; npx prisma migrate dev --name add_discovery_models`
Expected: migration créée et appliquée sans erreur, client Prisma régénéré.

- [ ] **Step 5: Lancer le test pour vérifier qu'il passe**

Run: `set -a; source .env; set +a; npx vitest run --config vitest.integration.config.mts lib/harvester/discovery-schema.integration.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations lib/harvester/discovery-schema.integration.test.ts
git commit -m "$(cat <<'EOF'
feat(db): schéma Prisma pour la découverte de cibles (DiscoveryProbe, DiscoveredTarget)

DiscoveryProbe est un cache global, volontairement hors scope userId — voir
docs/superpowers/specs/2026-08-30-decouverte-cibles-connecteurs-design.md
pour la justification. DiscoveredTarget est la file de revue par
utilisateur.
EOF
)"
```

---

## Task 2: Dérivation du slug d'entreprise

**Files:**
- Create: `lib/harvester/discovery/company-slug.ts`
- Test: `lib/harvester/discovery/company-slug.test.ts`

**Interfaces:**
- Consumes: `normalizeCompanyName` de `lib/harvester/company-name.ts` (déjà existant, retourne un nom normalisé espace-séparé, ex. `"capgemini"`, `""` pour `"SAS"` seul).
- Produces: `companySlug(companyName: string): string` — même normalisation, espaces remplacés par des tirets (ex. `"Acme One"` → `"acme-one"`), utilisé par toutes les tâches suivantes.

- [ ] **Step 1: Écrire le test qui échoue**

```typescript
// lib/harvester/discovery/company-slug.test.ts
import { describe, expect, it } from "vitest";
import { companySlug } from "@/lib/harvester/discovery/company-slug";

describe("companySlug", () => {
  it("normalizes and hyphenates a multi-word company name", () => {
    expect(companySlug("Acme One")).toBe("acme-one");
  });

  it("strips accents, case, and legal suffixes like normalizeCompanyName", () => {
    expect(companySlug("Décathlon SAS")).toBe("decathlon");
  });

  it("returns an empty string for a legal-suffix-only name", () => {
    expect(companySlug("SAS")).toBe("");
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run lib/harvester/discovery/company-slug.test.ts`
Expected: FAIL — module introuvable.

- [ ] **Step 3: Implémenter**

```typescript
// lib/harvester/discovery/company-slug.ts
import { normalizeCompanyName } from "@/lib/harvester/company-name";

export function companySlug(companyName: string): string {
  return normalizeCompanyName(companyName).replace(/\s+/g, "-");
}
```

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

Run: `npx vitest run lib/harvester/discovery/company-slug.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/harvester/discovery/company-slug.ts lib/harvester/discovery/company-slug.test.ts
git commit -m "feat(harvester): companySlug pour la découverte de cibles"
```

---

## Task 3: Sonde Workday

**Files:**
- Create: `lib/harvester/discovery/probe-workday.ts`
- Test: `lib/harvester/discovery/probe-workday.test.ts`

**Interfaces:**
- Consumes: `USER_AGENT` (`lib/harvester/user-agent.ts`).
- Produces: `probeWorkday(slug: string, fetchImpl: typeof fetch): Promise<{ tenant: string; site: string; dc: string } | undefined>` — même forme que `WorkdayTarget` (`lib/harvester/harvest-query.ts`).

- [ ] **Step 1: Écrire le test qui échoue**

```typescript
// lib/harvester/discovery/probe-workday.test.ts
import { describe, expect, it, vi } from "vitest";
import { probeWorkday } from "@/lib/harvester/discovery/probe-workday";

describe("probeWorkday", () => {
  it("returns the tenant/site/dc when the first datacenter responds ok", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      expect(String(input)).toBe("https://acme.wd1.myworkdayjobs.com/wday/cxs/acme/acme_jobs/jobs");
      return new Response("{}", { status: 200 });
    });

    const target = await probeWorkday("acme", fetchImpl);

    expect(target).toEqual({ tenant: "acme", site: "acme_jobs", dc: "wd1" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("falls through datacenters wd1 -> wd3 -> wd5 until one responds ok", async () => {
    let call = 0;
    const fetchImpl = vi.fn<typeof fetch>(async () => {
      call += 1;
      if (call < 3) return new Response("nope", { status: 404 });
      return new Response("{}", { status: 200 });
    });

    const target = await probeWorkday("acme", fetchImpl);

    expect(target).toEqual({ tenant: "acme", site: "acme_jobs", dc: "wd5" });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("returns undefined when no datacenter responds ok", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response("nope", { status: 404 }));

    const target = await probeWorkday("acme", fetchImpl);

    expect(target).toBeUndefined();
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("treats a thrown fetch (network error/timeout) on one datacenter as not-found for that one, tries the next", async () => {
    let call = 0;
    const fetchImpl = vi.fn<typeof fetch>(async () => {
      call += 1;
      if (call === 1) throw new Error("network unreachable");
      return new Response("{}", { status: 200 });
    });

    const target = await probeWorkday("acme", fetchImpl);

    expect(target).toEqual({ tenant: "acme", site: "acme_jobs", dc: "wd3" });
  });

  it("derives tenant by stripping hyphens from a multi-word slug", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      expect(String(input)).toBe("https://acmeone.wd1.myworkdayjobs.com/wday/cxs/acmeone/acmeone_jobs/jobs");
      return new Response("{}", { status: 200 });
    });

    await probeWorkday("acme-one", fetchImpl);
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run lib/harvester/discovery/probe-workday.test.ts`
Expected: FAIL — module introuvable.

- [ ] **Step 3: Implémenter**

```typescript
// lib/harvester/discovery/probe-workday.ts
import { USER_AGENT } from "@/lib/harvester/user-agent";

export interface DiscoveredWorkdayTarget {
  tenant: string;
  site: string;
  dc: string;
}

const DC_CANDIDATES = ["wd1", "wd3", "wd5"];

export async function probeWorkday(slug: string, fetchImpl: typeof fetch): Promise<DiscoveredWorkdayTarget | undefined> {
  const tenant = slug.replace(/-/g, "");
  const site = `${tenant}_jobs`;
  for (const dc of DC_CANDIDATES) {
    const url = `https://${tenant}.${dc}.myworkdayjobs.com/wday/cxs/${tenant}/${site}/jobs`;
    try {
      const response = await fetchImpl(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": USER_AGENT },
        body: JSON.stringify({ appliedFacets: {}, limit: 1, offset: 0, searchText: "" }),
        signal: AbortSignal.timeout(10_000),
      });
      if (response.ok) return { tenant, site, dc };
    } catch {
      continue;
    }
  }
  return undefined;
}
```

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

Run: `npx vitest run lib/harvester/discovery/probe-workday.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/harvester/discovery/probe-workday.ts lib/harvester/discovery/probe-workday.test.ts
git commit -m "feat(harvester): sonde de découverte Workday"
```

---

## Task 4: Sonde SmartRecruiters

**Files:**
- Create: `lib/harvester/discovery/probe-smartrecruiters.ts`
- Test: `lib/harvester/discovery/probe-smartrecruiters.test.ts`

**Interfaces:**
- Consumes: `USER_AGENT`.
- Produces: `probeSmartRecruiters(slug: string, fetchImpl: typeof fetch): Promise<string | undefined>` — le code entreprise SmartRecruiters (majuscules) si trouvé.

- [ ] **Step 1: Écrire le test qui échoue**

```typescript
// lib/harvester/discovery/probe-smartrecruiters.test.ts
import { describe, expect, it, vi } from "vitest";
import { probeSmartRecruiters } from "@/lib/harvester/discovery/probe-smartrecruiters";

describe("probeSmartRecruiters", () => {
  it("returns the uppercased company code when postings are found", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      expect(String(input)).toBe("https://api.smartrecruiters.com/v1/companies/ACME/postings?limit=1");
      return new Response(JSON.stringify({ totalFound: 5 }), { status: 200 });
    });

    expect(await probeSmartRecruiters("acme", fetchImpl)).toBe("ACME");
  });

  it("returns undefined when totalFound is 0", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ totalFound: 0 }), { status: 200 }));

    expect(await probeSmartRecruiters("acme", fetchImpl)).toBeUndefined();
  });

  it("returns undefined when the request is not ok", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response("nope", { status: 404 }));

    expect(await probeSmartRecruiters("acme", fetchImpl)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run lib/harvester/discovery/probe-smartrecruiters.test.ts`
Expected: FAIL — module introuvable.

- [ ] **Step 3: Implémenter**

```typescript
// lib/harvester/discovery/probe-smartrecruiters.ts
import { USER_AGENT } from "@/lib/harvester/user-agent";

export async function probeSmartRecruiters(slug: string, fetchImpl: typeof fetch): Promise<string | undefined> {
  const company = slug.toUpperCase();
  const url = `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(company)}/postings?limit=1`;
  const response = await fetchImpl(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(10_000) });
  if (!response.ok) return undefined;
  const body = (await response.json()) as { totalFound?: unknown };
  if (typeof body.totalFound !== "number" || body.totalFound === 0) return undefined;
  return company;
}
```

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

Run: `npx vitest run lib/harvester/discovery/probe-smartrecruiters.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/harvester/discovery/probe-smartrecruiters.ts lib/harvester/discovery/probe-smartrecruiters.test.ts
git commit -m "feat(harvester): sonde de découverte SmartRecruiters"
```

---

## Task 5: Sonde Talentsoft

**Files:**
- Create: `lib/harvester/discovery/probe-talentsoft.ts`
- Test: `lib/harvester/discovery/probe-talentsoft.test.ts`

**Interfaces:**
- Consumes: `isAllowedByRobots(url: string, userAgent: string, fetchImpl: typeof fetch): Promise<boolean>` (`lib/harvester/robots.ts`, déjà existant), `USER_AGENT`.
- Produces: `probeTalentsoft(slug: string, fetchImpl: typeof fetch): Promise<string | undefined>` — le domaine trouvé.

- [ ] **Step 1: Écrire le test qui échoue**

Le cache `robots.txt` de `lib/harvester/robots.ts` est indexé par origine — utiliser un slug distinct par test (pas de helper de reset exposé) pour éviter toute pollution entre tests.

```typescript
// lib/harvester/discovery/probe-talentsoft.test.ts
import { describe, expect, it, vi } from "vitest";
import { probeTalentsoft } from "@/lib/harvester/discovery/probe-talentsoft";

function allowAllRobots(): Response {
  return new Response("User-agent: *\nAllow: /", { status: 200 });
}

describe("probeTalentsoft", () => {
  it("returns the first candidate domain whose page looks like Talentsoft", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);
      if (url.endsWith("/robots.txt")) return allowAllRobots();
      if (url === "https://recrutement.acme-tsft-a.fr/") return new Response("nope", { status: 404 });
      if (url === "https://acme-tsft-a-recrute.talent-soft.com/") {
        return new Response("<html>__VIEWSTATE=abc</html>", { status: 200 });
      }
      return new Response("nope", { status: 404 });
    });

    expect(await probeTalentsoft("acme-tsft-a", fetchImpl)).toBe("acme-tsft-a-recrute.talent-soft.com");
  });

  it("returns undefined when no candidate domain matches", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);
      if (url.endsWith("/robots.txt")) return allowAllRobots();
      return new Response("nope", { status: 404 });
    });

    expect(await probeTalentsoft("acme-tsft-b", fetchImpl)).toBeUndefined();
  });

  it("skips a candidate domain disallowed by robots.txt without fetching its page", async () => {
    const pageFetches: string[] = [];
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);
      if (url === "https://recrutement.acme-tsft-c.fr/robots.txt") {
        return new Response("User-agent: *\nDisallow: /", { status: 200 });
      }
      if (url.endsWith("/robots.txt")) return allowAllRobots();
      pageFetches.push(url);
      if (url === "https://acme-tsft-c-recrute.talent-soft.com/") {
        return new Response("<html>__VIEWSTATE=abc</html>", { status: 200 });
      }
      return new Response("nope", { status: 404 });
    });

    expect(await probeTalentsoft("acme-tsft-c", fetchImpl)).toBe("acme-tsft-c-recrute.talent-soft.com");
    expect(pageFetches).not.toContain("https://recrutement.acme-tsft-c.fr/");
  });

  it("treats a thrown page fetch as no match for that domain and tries the next", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);
      if (url.endsWith("/robots.txt")) return allowAllRobots();
      if (url === "https://recrutement.acme-tsft-d.fr/") throw new Error("timeout");
      if (url === "https://acme-tsft-d-recrute.talent-soft.com/") {
        return new Response("<html>__VIEWSTATE=abc</html>", { status: 200 });
      }
      return new Response("nope", { status: 404 });
    });

    expect(await probeTalentsoft("acme-tsft-d", fetchImpl)).toBe("acme-tsft-d-recrute.talent-soft.com");
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run lib/harvester/discovery/probe-talentsoft.test.ts`
Expected: FAIL — module introuvable.

- [ ] **Step 3: Implémenter**

```typescript
// lib/harvester/discovery/probe-talentsoft.ts
import { isAllowedByRobots } from "@/lib/harvester/robots";
import { USER_AGENT } from "@/lib/harvester/user-agent";

function candidateDomains(slug: string): string[] {
  return [
    `recrutement.${slug}.fr`,
    `${slug}-recrute.talent-soft.com`,
    `${slug}-career.talent-soft.com`,
    `${slug}-cand.talent-soft.com`,
    `${slug}.talent-soft.com`,
  ];
}

function looksLikeTalentsoft(html: string): boolean {
  return /__VIEWSTATE|talentsoft/i.test(html);
}

// isAllowedByRobots() fait son propre fetchImpl(robotsUrl) sans init, donc sans timeout — on
// l'enveloppe ici pour lui donner le même délai de 10s que la requête de page qui suit.
function withTimeout(fetchImpl: typeof fetch): typeof fetch {
  return (input, init) => fetchImpl(input, { ...init, signal: AbortSignal.timeout(10_000) });
}

export async function probeTalentsoft(slug: string, fetchImpl: typeof fetch): Promise<string | undefined> {
  for (const domain of candidateDomains(slug)) {
    const rootUrl = `https://${domain}/`;
    const allowed = await isAllowedByRobots(rootUrl, USER_AGENT, withTimeout(fetchImpl));
    if (!allowed) continue;
    try {
      const response = await fetchImpl(rootUrl, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(10_000) });
      if (!response.ok) continue;
      const html = await response.text();
      if (looksLikeTalentsoft(html)) return domain;
    } catch {
      continue;
    }
  }
  return undefined;
}
```

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

Run: `npx vitest run lib/harvester/discovery/probe-talentsoft.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/harvester/discovery/probe-talentsoft.ts lib/harvester/discovery/probe-talentsoft.test.ts
git commit -m "feat(harvester): sonde de découverte Talentsoft"
```

---

## Task 6: Sonde DigitalRecruiters

**Files:**
- Create: `lib/harvester/discovery/probe-digitalrecruiters.ts`
- Test: `lib/harvester/discovery/probe-digitalrecruiters.test.ts`

**Interfaces:**
- Consumes: `USER_AGENT`.
- Produces: `probeDigitalRecruiters(slug: string, fetchImpl: typeof fetch): Promise<string | undefined>` — le domaine `joinus.<slug>.fr` si trouvé.

- [ ] **Step 1: Écrire le test qui échoue**

```typescript
// lib/harvester/discovery/probe-digitalrecruiters.test.ts
import { describe, expect, it, vi } from "vitest";
import { probeDigitalRecruiters } from "@/lib/harvester/discovery/probe-digitalrecruiters";

describe("probeDigitalRecruiters", () => {
  it("returns the joinus domain when the API responds with a numeric count", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      expect(String(input)).toBe(
        "https://api.digitalrecruiters.com/public/v1/careers-site/job-ads?domainName=joinus.acme.fr&limit=1&page=1&locale=fr_FR"
      );
      return new Response(JSON.stringify({ count: 3 }), { status: 200 });
    });

    expect(await probeDigitalRecruiters("acme", fetchImpl)).toBe("joinus.acme.fr");
  });

  it("returns undefined when the response is not ok", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response("nope", { status: 404 }));

    expect(await probeDigitalRecruiters("acme", fetchImpl)).toBeUndefined();
  });

  it("returns undefined when the body has no numeric count", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({}), { status: 200 }));

    expect(await probeDigitalRecruiters("acme", fetchImpl)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run lib/harvester/discovery/probe-digitalrecruiters.test.ts`
Expected: FAIL — module introuvable.

- [ ] **Step 3: Implémenter**

```typescript
// lib/harvester/discovery/probe-digitalrecruiters.ts
import { USER_AGENT } from "@/lib/harvester/user-agent";

export async function probeDigitalRecruiters(slug: string, fetchImpl: typeof fetch): Promise<string | undefined> {
  const domain = `joinus.${slug}.fr`;
  const url = `https://api.digitalrecruiters.com/public/v1/careers-site/job-ads?domainName=${encodeURIComponent(domain)}&limit=1&page=1&locale=fr_FR`;
  const response = await fetchImpl(url, {
    method: "POST",
    headers: { "User-Agent": USER_AGENT, "Content-Type": "application/json" },
    body: JSON.stringify({ filters: {}, coordinates: { lat: 0, lng: 0 } }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) return undefined;
  const body = (await response.json()) as { count?: unknown };
  if (typeof body.count !== "number") return undefined;
  return domain;
}
```

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

Run: `npx vitest run lib/harvester/discovery/probe-digitalrecruiters.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/harvester/discovery/probe-digitalrecruiters.ts lib/harvester/discovery/probe-digitalrecruiters.test.ts
git commit -m "feat(harvester): sonde de découverte DigitalRecruiters"
```

---

## Task 7: Orchestrateur `discoverTargets`

**Files:**
- Create: `lib/harvester/discovery/discover-targets.ts`
- Test: `lib/harvester/discovery/discover-targets.integration.test.ts`

**Interfaces:**
- Consumes: `companySlug` (Task 2), `probeWorkday`/`probeSmartRecruiters`/`probeTalentsoft`/`probeDigitalRecruiters` (Tasks 3-6), `PrismaClient` (`@prisma/client`), `createRateLimitedFetch` (`lib/harvester/rate-limited-fetch.ts`), `logger` (`lib/logger.ts`).
- Produces: `discoverTargets(prisma: PrismaClient, userId: string, options?: { fetchImpl?: typeof fetch; limit?: number }): Promise<{ probed: number; found: number }>`.

- [ ] **Step 1: Écrire le test qui échoue**

```typescript
// lib/harvester/discovery/discover-targets.integration.test.ts
import { describe, expect, it, afterEach, afterAll, beforeAll, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { discoverTargets } from "@/lib/harvester/discovery/discover-targets";

const prisma = new PrismaClient();
let userId: string;
let otherUserId: string;
const createdOfferIds: string[] = [];

beforeAll(async () => {
  const user = await prisma.user.create({ data: { email: `discover-${randomUUID()}@example.com`, passwordHash: "x" } });
  userId = user.id;
  const other = await prisma.user.create({ data: { email: `discover-other-${randomUUID()}@example.com`, passwordHash: "x" } });
  otherUserId = other.id;
});

afterEach(async () => {
  await prisma.discoveredTarget.deleteMany({ where: { userId: { in: [userId, otherUserId] } } });
  await prisma.discoveryProbe.deleteMany();
  await prisma.harvestedOffer.deleteMany({ where: { id: { in: createdOfferIds } } });
  createdOfferIds.length = 0;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: [userId, otherUserId] } } });
  await prisma.$disconnect();
});

async function makeOfferForCompany(forUserId: string, companyName: string): Promise<void> {
  const offer = await prisma.harvestedOffer.create({
    data: {
      userId: forUserId,
      campaign: {
        create: {
          userId: forUserId,
          slug: `discovery-fixture-${randomUUID()}`,
          romeCodes: [],
          keywords: [],
          contractTypes: [],
          config: { locations: [] },
        },
      },
      source: "fake",
      sourceOfferId: randomUUID(),
      canonicalUrl: `https://example.com/${randomUUID()}`,
      title: "Job",
      companyName,
      companyNormalizedName: companyName.toLowerCase(),
      locationLabel: "Lille",
      city: "Lille",
      contractType: "APPRENTISSAGE",
      romeCodes: [],
      descriptionText: "desc",
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
      lifecycle: "ACTIVE",
      dedupKey: randomUUID(),
      sourceRefs: [],
      rawPayload: {},
    },
  });
  createdOfferIds.push(offer.id);
}

function fetchImplFoundOnDigitalRecruitersOnly(): typeof fetch {
  return vi.fn<typeof fetch>(async (input) => {
    const url = String(input);
    if (url.includes("digitalrecruiters.com")) return new Response(JSON.stringify({ count: 5 }), { status: 200 });
    return new Response("nope", { status: 404 });
  });
}

describe("discoverTargets", () => {
  it("probes companies from the user's own offers, records every platform result, and creates a PENDING DiscoveredTarget on a hit", async () => {
    await makeOfferForCompany(userId, "Acme Discover A");
    const fetchImpl = fetchImplFoundOnDigitalRecruitersOnly();

    const summary = await discoverTargets(prisma, userId, { fetchImpl });

    expect(summary).toEqual({ probed: 1, found: 1 });

    const probes = await prisma.discoveryProbe.findMany({ where: { companySlug: "acme-discover-a" } });
    expect(probes).toHaveLength(4);

    const targets = await prisma.discoveredTarget.findMany({ where: { userId } });
    expect(targets).toHaveLength(1);
    expect(targets[0]).toMatchObject({
      companySlug: "acme-discover-a",
      companyName: "Acme Discover A",
      platform: "DIGITALRECRUITERS",
      target: "joinus.acme-discover-a.fr",
      status: "PENDING",
    });
  });

  it("never re-probes a company already fully probed by another user (global cache)", async () => {
    await makeOfferForCompany(otherUserId, "Acme Discover B");
    await discoverTargets(prisma, otherUserId, { fetchImpl: fetchImplFoundOnDigitalRecruitersOnly() });

    await makeOfferForCompany(userId, "Acme Discover B");
    const fetchImpl = vi.fn<typeof fetch>(async () => {
      throw new Error("should not be called: company already fully probed");
    });

    const summary = await discoverTargets(prisma, userId, { fetchImpl });

    expect(summary).toEqual({ probed: 0, found: 0 });
  });

  it("still creates a DiscoveredTarget for this user from an already-probed hit found via another user", async () => {
    await makeOfferForCompany(otherUserId, "Acme Discover C");
    await discoverTargets(prisma, otherUserId, { fetchImpl: fetchImplFoundOnDigitalRecruitersOnly() });

    await makeOfferForCompany(userId, "Acme Discover C");
    const summary = await discoverTargets(prisma, userId, {
      fetchImpl: vi.fn<typeof fetch>(async () => new Response("nope", { status: 404 })),
    });

    expect(summary).toEqual({ probed: 0, found: 1 });
    const targets = await prisma.discoveredTarget.findMany({ where: { userId } });
    expect(targets).toHaveLength(1);
    expect(targets[0]?.platform).toBe("DIGITALRECRUITERS");
  });

  it("caps newly-probed companies at the given limit", async () => {
    await makeOfferForCompany(userId, "Acme Discover D1");
    await makeOfferForCompany(userId, "Acme Discover D2");
    await makeOfferForCompany(userId, "Acme Discover D3");
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response("nope", { status: 404 }));

    const summary = await discoverTargets(prisma, userId, { fetchImpl, limit: 2 });

    expect(summary.probed).toBe(2);
  });

  it("never probes a company name that normalizes to an empty slug", async () => {
    await makeOfferForCompany(userId, "SAS");
    const fetchImpl = vi.fn<typeof fetch>(async () => {
      throw new Error("should not be called");
    });

    const summary = await discoverTargets(prisma, userId, { fetchImpl });

    expect(summary).toEqual({ probed: 0, found: 0 });
  });

  it("does not record a probe that throws, keeping the pair eligible for retry", async () => {
    await makeOfferForCompany(userId, "Acme Discover E");
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);
      if (url.includes("smartrecruiters.com")) throw new Error("boom");
      if (url.includes("digitalrecruiters.com")) return new Response(JSON.stringify({ count: 1 }), { status: 200 });
      return new Response("nope", { status: 404 });
    });

    await discoverTargets(prisma, userId, { fetchImpl });

    const probes = await prisma.discoveryProbe.findMany({ where: { companySlug: "acme-discover-e" } });
    expect(probes).toHaveLength(3);
    expect(probes.some((p) => p.platform === "SMARTRECRUITERS")).toBe(false);
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `set -a; source .env; set +a; npx vitest run --config vitest.integration.config.mts lib/harvester/discovery/discover-targets.integration.test.ts`
Expected: FAIL — module introuvable.

- [ ] **Step 3: Implémenter**

```typescript
// lib/harvester/discovery/discover-targets.ts
import type { DiscoveryPlatform, PrismaClient } from "@prisma/client";
import { companySlug } from "@/lib/harvester/discovery/company-slug";
import { probeWorkday } from "@/lib/harvester/discovery/probe-workday";
import { probeSmartRecruiters } from "@/lib/harvester/discovery/probe-smartrecruiters";
import { probeTalentsoft } from "@/lib/harvester/discovery/probe-talentsoft";
import { probeDigitalRecruiters } from "@/lib/harvester/discovery/probe-digitalrecruiters";
import { createRateLimitedFetch } from "@/lib/harvester/rate-limited-fetch";

const DEFAULT_LIMIT = 20;
const ALL_PLATFORMS: DiscoveryPlatform[] = ["WORKDAY", "SMARTRECRUITERS", "TALENTSOFT", "DIGITALRECRUITERS"];

const sharedGuardedFetch = createRateLimitedFetch(fetch);

export interface DiscoverTargetsOptions {
  fetchImpl?: typeof fetch;
  limit?: number;
}

export interface DiscoverTargetsSummary {
  probed: number;
  found: number;
}

type ProbeResult = { ok: true; value: unknown | undefined } | { ok: false };

// Distingue "la sonde a tourné et a un résultat (trouvé ou pas)" de "la sonde a levé une
// exception" — seul le premier cas doit être écrit dans DiscoveryProbe, sous peine de
// transformer un incident réseau transitoire en "jamais retenté".
async function safeProbe(probe: () => Promise<unknown | undefined>): Promise<ProbeResult> {
  try {
    return { ok: true, value: await probe() };
  } catch {
    return { ok: false };
  }
}

const PROBES: Record<DiscoveryPlatform, (slug: string, fetchImpl: typeof fetch) => Promise<unknown | undefined>> = {
  WORKDAY: probeWorkday,
  SMARTRECRUITERS: probeSmartRecruiters,
  TALENTSOFT: probeTalentsoft,
  DIGITALRECRUITERS: probeDigitalRecruiters,
};

export async function discoverTargets(
  prisma: PrismaClient,
  userId: string,
  options: DiscoverTargetsOptions = {}
): Promise<DiscoverTargetsSummary> {
  const fetchImpl = options.fetchImpl ?? sharedGuardedFetch;
  const limit = options.limit ?? DEFAULT_LIMIT;

  const offers = await prisma.harvestedOffer.findMany({
    where: { userId },
    distinct: ["companyNormalizedName"],
    select: { companyName: true, companyNormalizedName: true },
  });

  const candidates = new Map<string, string>(); // slug -> companyName (première occurrence)
  for (const offer of offers) {
    const slug = companySlug(offer.companyName);
    if (slug.length > 0 && !candidates.has(slug)) candidates.set(slug, offer.companyName);
  }

  const existingProbes = await prisma.discoveryProbe.findMany({
    where: { companySlug: { in: [...candidates.keys()] } },
    select: { companySlug: true, platform: true, found: true, target: true },
  });
  const probedPairs = new Set(existingProbes.map((p) => `${p.companySlug}::${p.platform}`));
  const isFullyProbed = (slug: string) => ALL_PLATFORMS.every((platform) => probedPairs.has(`${slug}::${platform}`));

  let foundCount = 0;

  // Cibles déjà connues (sondées par un autre utilisateur avant celui-ci) : créer la
  // DiscoveredTarget de cet utilisateur sans re-sonder, avant même de compter le plafond.
  for (const probe of existingProbes) {
    if (!probe.found || probe.target === null) continue;
    if (!candidates.has(probe.companySlug)) continue;
    const created = await createDiscoveredTargetIfMissing(prisma, userId, probe.companySlug, candidates.get(probe.companySlug)!, probe.platform, probe.target);
    if (created) foundCount += 1;
  }

  const toProbe = [...candidates.keys()].filter((slug) => !isFullyProbed(slug)).slice(0, limit);

  for (const slug of toProbe) {
    const companyName = candidates.get(slug)!;
    for (const platform of ALL_PLATFORMS) {
      if (probedPairs.has(`${slug}::${platform}`)) continue;
      const result = await safeProbe(() => PROBES[platform](slug, fetchImpl));
      if (!result.ok) continue;
      await prisma.discoveryProbe.create({
        data: { companySlug: slug, platform, found: result.value !== undefined, target: result.value ?? null },
      });
      if (result.value !== undefined) {
        const created = await createDiscoveredTargetIfMissing(prisma, userId, slug, companyName, platform, result.value);
        if (created) foundCount += 1;
      }
    }
  }

  return { probed: toProbe.length, found: foundCount };
}

async function createDiscoveredTargetIfMissing(
  prisma: PrismaClient,
  userId: string,
  companySlugValue: string,
  companyName: string,
  platform: DiscoveryPlatform,
  target: unknown
): Promise<boolean> {
  const existing = await prisma.discoveredTarget.findUnique({
    where: { userId_companySlug_platform: { userId, companySlug: companySlugValue, platform } },
  });
  if (existing) return false;
  await prisma.discoveredTarget.create({
    data: { userId, companySlug: companySlugValue, companyName, platform, target: target as object },
  });
  return true;
}
```

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

Run: `set -a; source .env; set +a; npx vitest run --config vitest.integration.config.mts lib/harvester/discovery/discover-targets.integration.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/harvester/discovery/discover-targets.ts lib/harvester/discovery/discover-targets.integration.test.ts
git commit -m "feat(harvester): orchestrateur discoverTargets"
```

---

## Task 8: Câblage dans `triggerCampaignCollection`

**Files:**
- Modify: `app/actions/harvest.ts`
- Test: `app/actions/harvest.test.ts` (fichier existant — ajouter les nouveaux cas)

**Interfaces:**
- Consumes: `discoverTargets` (Task 7).
- Produces: `triggerCampaignCollection` continue de renvoyer `ActionResult<{ runs: RunSummary[] }>` inchangé — la découverte n'apparaît pas dans la réponse (elle alimente la file `/harvester/discovery`, lue séparément).

**Contexte exact du fichier existant** (`app/actions/harvest.test.ts`) au moment de l'écriture de ce plan : `mockAuthedAs(userId: string)` est le helper déjà en place pour simuler une session (défini vers la ligne 42) ; il n'y a pas de fixture `campaign` partagée — chaque test construit son propre littéral inline, ex. `{ id: "c1", userId: "trigger-user-success" }` ; le bloc `vi.mock("@/lib/prisma", ...)` (ligne ~23) ne mocke que `campaign.findUnique`, `harvestedOffer.*`, `job.create`. Si le fichier a changé depuis, relire son état actuel avant d'appliquer ce step et ajuster en conséquence — mais la structure ci-dessous est directement copiable en l'état à la date de ce plan.

- [ ] **Step 1: Écrire le test qui échoue**

Ajouter en haut du fichier, aux côtés des `vi.mock(...)` déjà présents (après celui de `@/lib/harvester/connectors`) :

```typescript
vi.mock("@/lib/harvester/discovery/discover-targets", () => ({
  discoverTargets: vi.fn(),
}));
```

Ajouter `discoverTargets` à l'import déjà présent en haut du fichier :

```typescript
import { discoverTargets } from "@/lib/harvester/discovery/discover-targets";
```

Dans le `beforeEach` existant, ajouter le reset :

```typescript
  vi.mocked(discoverTargets).mockReset();
```

Ajouter dans `describe("triggerCampaignCollection", ...)`, juste après le test `"runs the orchestrator against the owned campaign and returns the run summaries"` :

```typescript
  it("calls discoverTargets once after a successful collection, without affecting the result", async () => {
    mockAuthedAs("trigger-user-discovery");
    const campaign = { id: "c1", userId: "trigger-user-discovery" };
    vi.mocked(prisma.campaign.findUnique).mockResolvedValue(campaign as never);
    vi.mocked(runCampaignAcrossConnectors).mockResolvedValue([]);
    vi.mocked(discoverTargets).mockResolvedValue({ probed: 2, found: 1 });

    const result = await triggerCampaignCollection({ campaignId: "c1" });

    expect(result).toEqual({ ok: true, data: { runs: [] } });
    expect(discoverTargets).toHaveBeenCalledWith(prisma, "trigger-user-discovery", {});
  });

  it("does not fail the collection when discoverTargets throws", async () => {
    mockAuthedAs("trigger-user-discovery-fail");
    const campaign = { id: "c1", userId: "trigger-user-discovery-fail" };
    vi.mocked(prisma.campaign.findUnique).mockResolvedValue(campaign as never);
    vi.mocked(runCampaignAcrossConnectors).mockResolvedValue([]);
    vi.mocked(discoverTargets).mockRejectedValue(new Error("network down"));

    const result = await triggerCampaignCollection({ campaignId: "c1" });

    expect(result).toEqual({ ok: true, data: { runs: [] } });
  });
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run app/actions/harvest.test.ts`
Expected: FAIL — `discoverTargets` non appelé (le code de production ne l'appelle pas encore).

- [ ] **Step 3: Implémenter**

Dans `app/actions/harvest.ts`, ajouter l'import :

```typescript
import { discoverTargets } from "@/lib/harvester/discovery/discover-targets";
```

Modifier le corps de `triggerCampaignCollection` (juste avant `revalidatePath("/harvester/review")`) :

```typescript
    const runs = await runCampaignAcrossConnectors(campaign, ALL_CONNECTORS, prisma, harvestEnv());

    // Best-effort : une erreur ici ne doit jamais faire échouer la collecte principale, ni
    // ralentir sa réponse au-delà du temps de sondage (pas de trigger dans le cron — voir la
    // spec — donc le coût réseau supplémentaire n'arrive qu'ici, à un moment où l'utilisateur
    // est déjà en train d'attendre le résultat de la collecte).
    try {
      await discoverTargets(prisma, auth.user.id, {});
    } catch (error) {
      logActionError("triggerCampaignCollection.discoverTargets", error, { userId: auth.user.id }, "warn");
    }

    revalidatePath("/harvester/review");
    revalidatePath("/harvester/discovery");
```

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

Run: `npx vitest run app/actions/harvest.test.ts`
Expected: PASS (tous les tests, y compris les 2 nouveaux).

- [ ] **Step 5: Lancer toute la suite harvester pour vérifier l'absence de régression**

Run: `npx vitest run lib/harvester/ app/actions/`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/actions/harvest.ts app/actions/harvest.test.ts
git commit -m "feat(harvester): déclenche discoverTargets après une collecte manuelle, en best-effort"
```

---

## Task 9: Server Actions de revue (`approveDiscoveredTarget`, `rejectDiscoveredTarget`)

**Files:**
- Create: `app/actions/discovery.ts`
- Create: `lib/harvester/discovery-validation.ts`
- Create: `lib/harvester/pending-discovered-target-count.ts`
- Test: `app/actions/discovery.test.ts`
- Test: `lib/harvester/pending-discovered-target-count.test.ts`

**Interfaces:**
- Consumes: `requireUser`, `prisma`, `actionError`, `firstIssueMessage`, `logActionError`, `ActionResult` (`app/actions/_shared.ts`, `@/lib/auth/session`, `@/lib/prisma`).
- Produces (pas de `listDiscoveredTargets` — la page `/harvester/discovery` (Task 11) interroge Prisma directement, comme `review/page.tsx` le fait déjà pour les offres) :
  - `approveDiscoveredTarget(input: unknown): Promise<ActionResult<null>>` — `{ targetId: string }`.
  - `rejectDiscoveredTarget(input: unknown): Promise<ActionResult<null>>` — `{ targetId: string }`.
  - `getPendingDiscoveredTargetCount(userId: string): Promise<number>`.

- [ ] **Step 1: Écrire le test qui échoue pour `getPendingDiscoveredTargetCount`**

```typescript
// lib/harvester/pending-discovered-target-count.test.ts
import { describe, expect, it, vi } from "vitest";
import { getPendingDiscoveredTargetCount } from "@/lib/harvester/pending-discovered-target-count";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: { discoveredTarget: { count: vi.fn() } },
}));

describe("getPendingDiscoveredTargetCount", () => {
  it("counts only PENDING targets for the given user", async () => {
    vi.mocked(prisma.discoveredTarget.count).mockResolvedValue(3);

    const count = await getPendingDiscoveredTargetCount("user-1");

    expect(count).toBe(3);
    expect(prisma.discoveredTarget.count).toHaveBeenCalledWith({
      where: { userId: "user-1", status: "PENDING" },
    });
  });
});
```

- [ ] **Step 2: Lancer le test, vérifier qu'il échoue, puis implémenter**

Run: `npx vitest run lib/harvester/pending-discovered-target-count.test.ts` → FAIL (module introuvable).

```typescript
// lib/harvester/pending-discovered-target-count.ts
import { prisma } from "@/lib/prisma";

export function getPendingDiscoveredTargetCount(userId: string) {
  return prisma.discoveredTarget.count({ where: { userId, status: "PENDING" } });
}
```

Run: `npx vitest run lib/harvester/pending-discovered-target-count.test.ts` → PASS.

- [ ] **Step 3: Écrire `lib/harvester/discovery-validation.ts`** (pas de TDD nécessaire — schéma Zod pur, un seul champ, même forme que `ignoreHarvestedOfferSchema`)

```typescript
// lib/harvester/discovery-validation.ts
import { z } from "zod";

const idSchema = z.string().trim().min(1, "Identifiant invalide");

export const approveDiscoveredTargetSchema = z.object({ targetId: idSchema });
export const rejectDiscoveredTargetSchema = z.object({ targetId: idSchema });
```

- [ ] **Step 4: Écrire le test qui échoue pour les Server Actions**

```typescript
// app/actions/discovery.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { approveDiscoveredTarget, rejectDiscoveredTarget } from "@/app/actions/discovery";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requireUser: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    discoveredTarget: { findFirst: vi.fn(), update: vi.fn() },
    campaign: { findMany: vi.fn(), update: vi.fn() },
  },
}));

function mockAuthedAs(userId: string) {
  vi.mocked(requireUser).mockResolvedValue({ ok: true, user: { id: userId, email: `${userId}@example.com`, name: null } });
}

beforeEach(() => {
  vi.mocked(requireUser).mockReset();
  vi.mocked(prisma.discoveredTarget.findFirst).mockReset();
  vi.mocked(prisma.discoveredTarget.update).mockReset();
  vi.mocked(prisma.campaign.findMany).mockReset();
  vi.mocked(prisma.campaign.update).mockReset();
});

describe("approveDiscoveredTarget", () => {
  it("returns NOT_FOUND when the target doesn't belong to this user", async () => {
    mockAuthedAs("user-1");
    vi.mocked(prisma.discoveredTarget.findFirst).mockResolvedValue(null);

    const result = await approveDiscoveredTarget({ targetId: "t1" });

    expect(result).toMatchObject({ ok: false, code: "NOT_FOUND" });
    expect(prisma.campaign.findMany).not.toHaveBeenCalled();
  });

  it("adds the target to every campaign's config.targets for this user, deduplicated, and marks the row ADDED", async () => {
    mockAuthedAs("user-1");
    vi.mocked(prisma.discoveredTarget.findFirst).mockResolvedValue({
      id: "t1",
      userId: "user-1",
      platform: "SMARTRECRUITERS",
      target: "ACME",
    } as never);
    vi.mocked(prisma.campaign.findMany).mockResolvedValue([
      { id: "c1", userId: "user-1", config: { locations: [], targets: { smartrecruiters: ["OTHER"] } } },
      { id: "c2", userId: "user-1", config: { locations: [] } },
    ] as never);

    const result = await approveDiscoveredTarget({ targetId: "t1" });

    expect(result).toEqual({ ok: true, data: null });
    expect(prisma.campaign.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { config: { locations: [], targets: { smartrecruiters: ["OTHER", "ACME"] } } },
    });
    expect(prisma.campaign.update).toHaveBeenCalledWith({
      where: { id: "c2" },
      data: { config: { locations: [], targets: { smartrecruiters: ["ACME"] } } },
    });
    expect(prisma.discoveredTarget.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { status: "ADDED", reviewedAt: expect.any(Date) },
    });
  });

  it("does not duplicate the target in a campaign that already has it", async () => {
    mockAuthedAs("user-1");
    vi.mocked(prisma.discoveredTarget.findFirst).mockResolvedValue({
      id: "t1",
      userId: "user-1",
      platform: "SMARTRECRUITERS",
      target: "ACME",
    } as never);
    vi.mocked(prisma.campaign.findMany).mockResolvedValue([
      { id: "c1", userId: "user-1", config: { locations: [], targets: { smartrecruiters: ["ACME"] } } },
    ] as never);

    await approveDiscoveredTarget({ targetId: "t1" });

    expect(prisma.campaign.update).not.toHaveBeenCalled();
  });
});

describe("rejectDiscoveredTarget", () => {
  it("marks the target REJECTED without touching any campaign", async () => {
    mockAuthedAs("user-1");
    vi.mocked(prisma.discoveredTarget.findFirst).mockResolvedValue({ id: "t1", userId: "user-1" } as never);

    const result = await rejectDiscoveredTarget({ targetId: "t1" });

    expect(result).toEqual({ ok: true, data: null });
    expect(prisma.discoveredTarget.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { status: "REJECTED", reviewedAt: expect.any(Date) },
    });
    expect(prisma.campaign.findMany).not.toHaveBeenCalled();
  });

  it("returns NOT_FOUND when the target doesn't belong to this user", async () => {
    mockAuthedAs("user-1");
    vi.mocked(prisma.discoveredTarget.findFirst).mockResolvedValue(null);

    expect(await rejectDiscoveredTarget({ targetId: "t1" })).toMatchObject({ ok: false, code: "NOT_FOUND" });
  });
});
```

- [ ] **Step 5: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run app/actions/discovery.test.ts`
Expected: FAIL — module `@/app/actions/discovery` introuvable.

- [ ] **Step 6: Implémenter**

```typescript
// app/actions/discovery.ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { approveDiscoveredTargetSchema, rejectDiscoveredTargetSchema } from "@/lib/harvester/discovery-validation";
import { HarvestTargetsSchema } from "@/lib/harvester/harvest-query";
import { actionError, type ActionResult, firstIssueMessage, logActionError } from "./_shared";

const PLATFORM_TO_TARGETS_KEY = {
  WORKDAY: "workday",
  SMARTRECRUITERS: "smartrecruiters",
  TALENTSOFT: "talentsoft",
  DIGITALRECRUITERS: "digitalRecruiters",
} as const;

const CampaignConfigJsonSchema = z.object({
  locations: z.array(z.unknown()),
  targets: HarvestTargetsSchema.optional(),
});

/**
 * Approuve une cible découverte : l'ajoute à `config.targets` de chaque campagne de
 * l'utilisateur (dédupliqué), puis marque la ligne ADDED.
 *
 * @errors `UNAUTHENTICATED`, `VALIDATION_ERROR`, `NOT_FOUND` (cible introuvable pour cet
 * utilisateur), `INTERNAL_ERROR`.
 */
export async function approveDiscoveredTarget(input: unknown): Promise<ActionResult<null>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const parsed = approveDiscoveredTargetSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", firstIssueMessage(parsed.error, "Impossible d'approuver cette cible"));
  }

  try {
    const target = await prisma.discoveredTarget.findFirst({
      where: { id: parsed.data.targetId, userId: auth.user.id },
    });
    if (!target) {
      return actionError("NOT_FOUND", "Cible introuvable");
    }

    const targetsKey = PLATFORM_TO_TARGETS_KEY[target.platform];
    const campaigns = await prisma.campaign.findMany({ where: { userId: auth.user.id } });

    for (const campaign of campaigns) {
      const config = CampaignConfigJsonSchema.parse(campaign.config);
      const existingList = (config.targets?.[targetsKey] ?? []) as unknown[];
      const alreadyPresent = existingList.some((item) => JSON.stringify(item) === JSON.stringify(target.target));
      if (alreadyPresent) continue;

      const nextConfig = {
        ...config,
        targets: { ...config.targets, [targetsKey]: [...existingList, target.target] },
      };
      await prisma.campaign.update({ where: { id: campaign.id }, data: { config: nextConfig } });
    }

    await prisma.discoveredTarget.update({
      where: { id: target.id },
      data: { status: "ADDED", reviewedAt: new Date() },
    });

    revalidatePath("/harvester/discovery");
    revalidatePath("/harvester/campaigns");
    return { ok: true, data: null };
  } catch (error) {
    logActionError("approveDiscoveredTarget", error, { userId: auth.user.id });
    return actionError("INTERNAL_ERROR", "Impossible d'approuver cette cible");
  }
}

/**
 * Rejette une cible découverte — ne modifie aucune campagne. Pas d'annulation possible (YAGNI).
 *
 * @errors `UNAUTHENTICATED`, `VALIDATION_ERROR`, `NOT_FOUND`, `INTERNAL_ERROR`.
 */
export async function rejectDiscoveredTarget(input: unknown): Promise<ActionResult<null>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const parsed = rejectDiscoveredTargetSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", firstIssueMessage(parsed.error, "Impossible de rejeter cette cible"));
  }

  try {
    const target = await prisma.discoveredTarget.findFirst({
      where: { id: parsed.data.targetId, userId: auth.user.id },
    });
    if (!target) {
      return actionError("NOT_FOUND", "Cible introuvable");
    }

    await prisma.discoveredTarget.update({
      where: { id: target.id },
      data: { status: "REJECTED", reviewedAt: new Date() },
    });

    revalidatePath("/harvester/discovery");
    return { ok: true, data: null };
  } catch (error) {
    logActionError("rejectDiscoveredTarget", error, { userId: auth.user.id });
    return actionError("INTERNAL_ERROR", "Impossible de rejeter cette cible");
  }
}
```

- [ ] **Step 7: Lancer le test pour vérifier qu'il passe**

Run: `npx vitest run app/actions/discovery.test.ts lib/harvester/pending-discovered-target-count.test.ts`
Expected: PASS (tous les tests).

- [ ] **Step 8: Commit**

```bash
git add app/actions/discovery.ts lib/harvester/discovery-validation.ts lib/harvester/pending-discovered-target-count.ts app/actions/discovery.test.ts lib/harvester/pending-discovered-target-count.test.ts
git commit -m "feat(harvester): Server Actions de revue des cibles découvertes (lister/approuver/rejeter)"
```

---

## Task 10: Composant `DiscoveredTargetsManager`

**Files:**
- Create: `components/harvester/discovered-targets-manager.tsx`
- Test: `components/harvester/discovered-targets-manager.test.tsx`

**Interfaces:**
- Consumes: `approveDiscoveredTarget`, `rejectDiscoveredTarget` (Task 9), `Badge` (`components/ui/badge.tsx`), `Button` (`components/ui/button.tsx`).
- Produces: `DiscoveredTargetsManager({ initialTargets: DiscoveredTarget[] })` — composant client, liste simple (pas de pagination/filtres — liste naturellement bornée, cf. spec).

- [ ] **Step 1: Écrire le test qui échoue**

```typescript
// components/harvester/discovered-targets-manager.test.tsx
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { DiscoveredTarget } from "@prisma/client";
import { DiscoveredTargetsManager } from "@/components/harvester/discovered-targets-manager";
import { approveDiscoveredTarget, rejectDiscoveredTarget } from "@/app/actions/discovery";

vi.mock("@/app/actions/discovery", () => ({
  approveDiscoveredTarget: vi.fn(),
  rejectDiscoveredTarget: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const target: DiscoveredTarget = {
  id: "t1",
  userId: "user-1",
  companySlug: "acme",
  companyName: "Acme Corp",
  platform: "SMARTRECRUITERS",
  target: "ACME",
  status: "PENDING",
  discoveredAt: new Date("2026-01-01"),
  reviewedAt: null,
};

beforeEach(() => {
  vi.mocked(approveDiscoveredTarget).mockReset();
  vi.mocked(rejectDiscoveredTarget).mockReset();
});

describe("DiscoveredTargetsManager", () => {
  it("shows an empty state when there are no discovered targets", () => {
    render(<DiscoveredTargetsManager initialTargets={[]} />);
    expect(screen.getByText(/Aucune cible découverte/)).toBeInTheDocument();
  });

  it("lists a discovered target with its company name and platform", () => {
    render(<DiscoveredTargetsManager initialTargets={[target]} />);
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("SMARTRECRUITERS")).toBeInTheDocument();
  });

  it("approves a target and removes it from the list on success", async () => {
    const user = userEvent.setup();
    vi.mocked(approveDiscoveredTarget).mockResolvedValue({ ok: true, data: null });
    render(<DiscoveredTargetsManager initialTargets={[target]} />);

    await user.click(screen.getByRole("button", { name: "Approuver" }));

    expect(approveDiscoveredTarget).toHaveBeenCalledWith({ targetId: "t1" });
    expect(screen.queryByText("Acme Corp")).not.toBeInTheDocument();
  });

  it("rejects a target and removes it from the list on success", async () => {
    const user = userEvent.setup();
    vi.mocked(rejectDiscoveredTarget).mockResolvedValue({ ok: true, data: null });
    render(<DiscoveredTargetsManager initialTargets={[target]} />);

    await user.click(screen.getByRole("button", { name: "Rejeter" }));

    expect(rejectDiscoveredTarget).toHaveBeenCalledWith({ targetId: "t1" });
    expect(screen.queryByText("Acme Corp")).not.toBeInTheDocument();
  });

  it("keeps the target in the list and shows an error toast when approval fails", async () => {
    const user = userEvent.setup();
    vi.mocked(approveDiscoveredTarget).mockResolvedValue({ ok: false, error: "Impossible d'approuver cette cible", code: "INTERNAL_ERROR" });
    render(<DiscoveredTargetsManager initialTargets={[target]} />);

    await user.click(screen.getByRole("button", { name: "Approuver" }));

    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run components/harvester/discovered-targets-manager.test.tsx`
Expected: FAIL — module introuvable.

- [ ] **Step 3: Implémenter**

```typescript
// components/harvester/discovered-targets-manager.tsx
"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { DiscoveredTarget } from "@prisma/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { approveDiscoveredTarget, rejectDiscoveredTarget } from "@/app/actions/discovery";

function formatTarget(target: unknown): string {
  if (typeof target === "string") return target;
  if (target && typeof target === "object" && "tenant" in target) {
    const t = target as { tenant: string; site: string; dc: string };
    return `${t.tenant} / ${t.site} (${t.dc})`;
  }
  return JSON.stringify(target);
}

export function DiscoveredTargetsManager({ initialTargets }: { initialTargets: DiscoveredTarget[] }) {
  const [targets, setTargets] = useState(initialTargets);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  function removeTarget(id: string) {
    setTargets((prev) => prev.filter((t) => t.id !== id));
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

  async function handleApprove(id: string) {
    const result = await withPending(id, () => approveDiscoveredTarget({ targetId: id }));
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    removeTarget(id);
    toast.success("Cible ajoutée à vos campagnes");
  }

  async function handleReject(id: string) {
    const result = await withPending(id, () => rejectDiscoveredTarget({ targetId: id }));
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    removeTarget(id);
  }

  if (targets.length === 0) {
    return (
      <div
        data-testid="discovered-targets-empty-state"
        className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border p-8 text-center"
      >
        <p className="font-heading text-lg text-heading">Aucune cible découverte</p>
        <p className="max-w-md text-base text-muted-foreground">
          Lancez une collecte manuelle depuis une campagne — de nouvelles cibles apparaîtront ici
          si des entreprises déjà vues publient aussi sur Workday, SmartRecruiters, Talentsoft ou
          DigitalRecruiters.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {targets.map((target) => {
        const pending = pendingIds.has(target.id);
        return (
          <li
            key={target.id}
            className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 flex-col gap-1">
              <span className="font-heading text-sm leading-snug text-heading">{target.companyName}</span>
              <span className="flex flex-wrap items-center gap-1.5">
                <Badge variant="tag">{target.platform}</Badge>
                <span className="font-mono text-xs text-muted-foreground">{formatTarget(target.target)}</span>
              </span>
            </div>
            <span className="flex gap-1.5">
              <Button size="sm" variant="accent" disabled={pending} onClick={() => handleApprove(target.id)}>
                {pending && <Loader2 className="animate-spin" />}
                Approuver
              </Button>
              <Button size="sm" variant="outline" disabled={pending} onClick={() => handleReject(target.id)}>
                Rejeter
              </Button>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

Run: `npx vitest run components/harvester/discovered-targets-manager.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add components/harvester/discovered-targets-manager.tsx components/harvester/discovered-targets-manager.test.tsx
git commit -m "feat(harvester): composant DiscoveredTargetsManager"
```

---

## Task 11: Onglet, route `/harvester/discovery`, badge de compteur

**Files:**
- Modify: `components/harvester/harvester-tabs.tsx`
- Modify: `components/harvester/harvester-tabs.test.tsx`
- Modify: `app/harvester/page.tsx`
- Modify: `app/harvester/campaigns/page.tsx`
- Modify: `app/harvester/review/page.tsx`
- Create: `app/harvester/discovery/page.tsx`

**Interfaces:**
- Consumes: `getPendingDiscoveredTargetCount` (Task 9), `DiscoveredTargetsManager` (Task 10). La page interroge `prisma.discoveredTarget.findMany` directement (pas de Server Action `list*` — cohérent avec `review/page.tsx`, qui fait de même pour les offres).
- Produces: `HarvesterTabs` accepte une nouvelle prop `discoveredTargetCount?: number`, affiche un 4ème onglet "Cibles découvertes" vers `/harvester/discovery` avec badge.

- [ ] **Step 1: Écrire le test qui échoue pour `HarvesterTabs`**

Ajouter dans `components/harvester/harvester-tabs.test.tsx` :

```typescript
it("renders a link to the discovery route", () => {
  render(<HarvesterTabs />);
  expect(screen.getByRole("link", { name: /Cibles découvertes/ })).toHaveAttribute("href", "/harvester/discovery");
});

it("shows a count badge on the discovery tab when there are pending targets", () => {
  render(<HarvesterTabs discoveredTargetCount={2} />);
  const link = screen.getByRole("link", { name: /Cibles découvertes/ });
  expect(link).toHaveTextContent("2");
});

it("does not show a count badge on the discovery tab when there are no pending targets", () => {
  render(<HarvesterTabs discoveredTargetCount={0} />);
  const link = screen.getByRole("link", { name: "Cibles découvertes" });
  expect(link).not.toHaveTextContent("0");
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run components/harvester/harvester-tabs.test.tsx`
Expected: FAIL — lien "Cibles découvertes" introuvable.

- [ ] **Step 3: Implémenter le changement dans `HarvesterTabs`**

Remplacer le tableau `TABS` et la signature du composant :

```typescript
const TABS = [
  { href: "/harvester", label: "Vue d'ensemble" },
  { href: "/harvester/campaigns", label: "Campagnes" },
  { href: "/harvester/review", label: "File de revue" },
  { href: "/harvester/discovery", label: "Cibles découvertes" },
] as const;

interface HarvesterTabsProps {
  reviewQueueCount?: number;
  discoveredTargetCount?: number;
}

export function HarvesterTabs({ reviewQueueCount, discoveredTargetCount }: HarvesterTabsProps) {
```

Remplacer le bloc de badge conditionnel :

```typescript
          {tab.label}
          {tab.href === "/harvester/review" && !!reviewQueueCount && (
            <Badge variant="tag">{reviewQueueCount}</Badge>
          )}
          {tab.href === "/harvester/discovery" && !!discoveredTargetCount && (
            <Badge variant="tag">{discoveredTargetCount}</Badge>
          )}
```

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

Run: `npx vitest run components/harvester/harvester-tabs.test.tsx`
Expected: PASS (tous les tests, y compris les 3 nouveaux et les existants inchangés).

- [ ] **Step 5: Créer la page `/harvester/discovery`**

```typescript
// app/harvester/discovery/page.tsx
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getPendingOfferCount } from "@/lib/harvester/pending-offer-count";
import { getPendingDiscoveredTargetCount } from "@/lib/harvester/pending-discovered-target-count";
import { PageHeader } from "@/components/page-header";
import { HarvesterTabs } from "@/components/harvester/harvester-tabs";
import { DiscoveredTargetsManager } from "@/components/harvester/discovered-targets-manager";

export default async function HarvesterDiscoveryPage() {
  const session = await auth();
  const userId = session?.user?.id ?? "";

  const [targets, pendingOfferCount, discoveredTargetCount] = await Promise.all([
    prisma.discoveredTarget.findMany({
      where: { userId, status: "PENDING" },
      orderBy: { discoveredAt: "desc" },
    }),
    getPendingOfferCount(userId),
    getPendingDiscoveredTargetCount(userId),
  ]);

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-4 p-4">
      <PageHeader
        eyebrow="Harvester"
        title="Cibles découvertes"
        subtitle="Entreprises repérées dans vos offres et trouvées sur Workday, SmartRecruiters, Talentsoft ou DigitalRecruiters — approuvez pour les ajouter à vos campagnes."
      />
      <HarvesterTabs reviewQueueCount={pendingOfferCount} discoveredTargetCount={discoveredTargetCount} />
      <DiscoveredTargetsManager initialTargets={targets} />
    </div>
  );
}
```

- [ ] **Step 6: Mettre à jour les 3 pages existantes pour passer `discoveredTargetCount`**

Dans `app/harvester/page.tsx`, `app/harvester/campaigns/page.tsx`, `app/harvester/review/page.tsx` : ajouter l'import `getPendingDiscoveredTargetCount`, l'ajouter à la `Promise.all(...)`, et le passer à `<HarvesterTabs .../>`. Exemple pour `app/harvester/page.tsx` (les deux autres suivent le même schéma, en gardant leurs autres requêtes `Promise.all` inchangées) :

```typescript
import { getPendingDiscoveredTargetCount } from "@/lib/harvester/pending-discovered-target-count";

// ...

  const [campaignCount, pendingOfferCount, discoveredTargetCount] = await Promise.all([
    prisma.campaign.count({ where: { userId } }),
    getPendingOfferCount(userId),
    getPendingDiscoveredTargetCount(userId),
  ]);

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-4 p-4">
      <PageHeader
        eyebrow="Collecte automatisée"
        title="Harvester"
        subtitle="Campagnes de recherche et offres collectées en attente de revue."
      />
      <HarvesterTabs reviewQueueCount={pendingOfferCount} discoveredTargetCount={discoveredTargetCount} />
      <HarvesterOverview campaignCount={campaignCount} pendingOfferCount={pendingOfferCount} />
    </div>
  );
```

- [ ] **Step 7: Vérification manuelle en dev**

Run: `npx tsc --noEmit` (les 4 pages doivent typechecker sans erreur — `DiscoveredTarget`/`getPendingDiscoveredTargetCount` bien importés partout).

- [ ] **Step 8: Commit**

```bash
git add components/harvester/harvester-tabs.tsx components/harvester/harvester-tabs.test.tsx app/harvester/discovery/page.tsx app/harvester/page.tsx app/harvester/campaigns/page.tsx app/harvester/review/page.tsx
git commit -m "feat(harvester): onglet et page /harvester/discovery, badge de compteur"
```

---

## Task 12: Vérification de bout en bout et suite complète

**Files:** aucun — vérification uniquement, pas de nouveau code.

- [ ] **Step 1: Suite complète, unitaire + intégration**

Run:
```bash
npx vitest run
set -a; source .env; set +a
npx vitest run --config vitest.integration.config.mts
npx tsc --noEmit
npx eslint .
```
Expected: tout passe, 0 erreur de lint (warnings pré-existants tolérés, cf. sessions précédentes), aucune régression sur les 329+ tests déjà en place.

- [ ] **Step 2: Vérification en direct contre une vraie entreprise**

Écrire un script jetable (`scripts/tmp-check-discovery.ts`, supprimé après usage — même méthode que les vérifications WTTJ/France Travail des chantiers précédents de cette session) qui appelle `discoverTargets` avec un `PrismaClient` réel et un `userId` de test ayant une `HarvestedOffer` dont `companyName` est une entreprise connue pour être sur au moins une des 4 plateformes (ex. une entreprise du CAC40 déjà vue sur Workday lors de l'audit de ce fil — à choisir au moment de l'exécution). Confirmer :
- Au moins un `DiscoveryProbe` créé avec `found: true`.
- Une `DiscoveredTarget` PENDING créée pour l'utilisateur de test.
- Nettoyer les données de test créées (offre, probes, cible) avant de supprimer le script.

- [ ] **Step 3: Vérification manuelle dans le navigateur**

Avec le serveur dev lancé (`npm run dev`) et un compte de test connecté :
1. Aller sur `/harvester/campaigns`, cliquer "Lancer la collecte" sur une campagne dont au moins une offre a déjà été collectée pour une entreprise plausible.
2. Aller sur `/harvester/discovery` — vérifier que l'onglet affiche un badge si une cible a été trouvée, et que la liste affiche l'entreprise/plateforme/cible devinée.
3. Cliquer "Approuver" sur une entrée — vérifier via `/harvester/campaigns` (modifier une campagne) que la cible apparaît bien dans le formulaire (champ Workday/SmartRecruiters selon la plateforme).
4. Relancer une collecte — vérifier qu'aucune erreur ne survient et que les entreprises déjà entièrement sondées ne sont pas re-sondées (aucune nouvelle ligne `DiscoveryProbe` pour elles).

- [ ] **Step 4: Rapport final**

Résumer dans le chat : nombre de tests ajoutés, résultat de la vérification en direct (probe trouvé/pas trouvé sur l'entreprise choisie), et confirmation que la collecte principale n'est jamais impactée par un échec de découverte.
