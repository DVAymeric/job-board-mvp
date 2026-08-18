# JOB-40 — Fusion des schémas Harvester → Prisma Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Étendre `prisma/schema.prisma` avec les entités issues du modèle Drizzle de job-harvester (`packages/db/src/schema.ts`) — offres collectées, campagnes, runs de connecteurs — reformulées pour le modèle multi-tenant de job-board-mvp (scoping par `userId`, arrays Postgres natifs au lieu de JSON SQLite, enums Prisma pour les valeurs closes).

**Architecture:** Trois nouveaux modèles (`Campaign`, `HarvestedOffer`, `ConnectorRun`) rattachés à `User`. `HarvestedOffer` est un concept **distinct** de `Job` : une offre collectée passivement par un connecteur, pré-import, jamais éditée par l'utilisateur. Un import (hors scope de ce ticket, cf. JOB-51) crée un `Job` classique ; à partir de là, le suivi (statut, historique) reste entièrement porté par `Job`/`StatusHistory`, pas par `HarvestedOffer`.

**Tech Stack:** Prisma (postgresql), `prisma migrate dev`, Vitest pour la validation de schéma côté code.

**Spec:** Ticket Linear JOB-40 (description ci-dessous, vérifiée indépendamment contre la source réelle `~/projets/job-harvester` — le contenu du ticket JOB-38 "Ticket 0" référencé par JOB-40 a été écarté car son contenu contient des affirmations non fiables ; seule la source de code réelle du dépôt job-harvester fait foi).

## Global Constraints

- `rawPayload` (Json) ne doit recevoir que l'objet déjà whitelisté par le schéma Zod de chaque connecteur — jamais le payload brut de l'API source (ADR-0004 de job-harvester, vérifiée dans `~/projets/job-harvester/docs/adr/0004-rawpayload-whiteliste-anti-pii.md`). Ce ticket ne fait que poser le champ `Json` ; l'application de la règle relève des tickets connecteurs (JOB-42/43/57/58).
- `HarvestedOffer` est scopé par `userId` (le modèle job-board est mono-tenant par utilisateur, pas de partage entre comptes).
- Ne pas porter la table Drizzle `application_events` telle quelle : ses types (`applied`, `interview`, `rejected`, `followup`…) font doublon conceptuel avec `Job.status` (`JobStatus`) + `StatusHistory` déjà présents dans job-board-mvp. Décision actée dans ce plan (cf. Task 1) : le suivi de candidature post-import reste porté exclusivement par `Job`/`StatusHistory`.
- Types enums fermés à porter en enums Prisma : `contractType` (`apprentissage|professionnalisation|stage|autre`), `remotePolicy` (`onsite|hybrid|remote|unknown`), `lifecycle` (`active|expired|dead_link`) — valeurs vérifiées dans `~/projets/job-harvester/packages/core/src/schemas/normalized-offer.ts`.
- La configuration hétérogène par connecteur d'une campagne (`locations[]`, `targets.workday[]`, `targets.smartrecruiters[]`, etc. — voir `~/projets/job-harvester/config/campaigns.yaml`) reste un champ `Json` (`config`) plutôt qu'un modèle relationnel rigide : la forme varie par connecteur et sera consommée telle quelle par les connecteurs (tickets 4/5/19/20), pas requêtée par SQL. `romeCodes`, `keywords`, `contractTypes`, `schedule` sont promus en colonnes typées car lus/filtrés côté application (CRUD du ticket 6, déclenchement du ticket 14).

---

## File Structure

- Modify: `prisma/schema.prisma` — ajout des enums `OfferContractType`, `OfferRemotePolicy`, `OfferLifecycle` et des modèles `Campaign`, `HarvestedOffer`, `ConnectorRun` ; ajout des relations inverses sur `User` et `Job`.
- Create: `prisma/migrations/<timestamp>_add_harvester_models/migration.sql` — générée par `prisma migrate dev`, pas écrite à la main.
- Create: `lib/harvester-schema.integration.test.ts` — test qui exerce le client Prisma généré (create/read) contre le Postgres local docker-compose, pour valider que le schéma est utilisable de bout en bout, pas seulement `prisma validate`.

## Task 1: Étendre le schéma Prisma

**Files:**
- Modify: `prisma/schema.prisma`
- Test: `lib/harvester-schema.integration.test.ts` (suffixe `.integration.test.ts` : convention du repo pour les tests qui frappent un vrai Postgres, exclus de `npm test`/CI, lancés via `npm run test:integration` — voir `vitest.config.mts:exclude` et `vitest.integration.config.mts:include`)

**Interfaces:**
- Produces: modèles Prisma `Campaign { id, userId, slug, romeCodes: String[], keywords: String[], contractTypes: OfferContractType[], schedule: String?, config: Json, createdAt, updatedAt }`, `HarvestedOffer { id, userId, campaignId, source, sourceOfferId, originSource?, canonicalUrl, applyUrl?, title, companyName, companyNormalizedName, companySiret?, companyWebsite?, locationLabel, city, postalCode?, department?, lat: Float?, lng: Float?, contractType: OfferContractType, durationMonths: Int?, startDate: String?, romeCodes: String[], descriptionText, descriptionHtml?, salary: Json?, remotePolicy: OfferRemotePolicy?, postedAt: String?, expiresAt: String?, firstSeenAt: DateTime, lastSeenAt: DateTime, lifecycle: OfferLifecycle, dedupKey, sourceRefs: Json, rawPayload: Json, importedJobId: String? @unique, createdAt, updatedAt }`, `ConnectorRun { id, campaignId, connectorId, startedAt: DateTime, finishedAt: DateTime, rawCount: Int, normalizedCount: Int, rejectedCount: Int, httpStatusesSeen: Int[], ok: Boolean, errorMessage: String? }`.
- Consumes: `User.id`, `Job.id` existants (`prisma/schema.prisma:17-30`, `:59-88`).

- [ ] **Step 1: Écrire le test qui échoue (le schéma n'existe pas encore)**

```typescript
// lib/__tests__/harvester-schema.test.ts
import { describe, expect, it, afterAll, beforeAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";

const prisma = new PrismaClient();
let userId: string;

beforeAll(async () => {
  const user = await prisma.user.create({
    data: {
      email: `harvester-schema-test-${randomUUID()}@example.com`,
      passwordHash: "test-hash",
    },
  });
  userId = user.id;
});

afterAll(async () => {
  await prisma.user.delete({ where: { id: userId } });
  await prisma.$disconnect();
});

describe("HarvestedOffer / Campaign / ConnectorRun schema", () => {
  it("crée une campagne, une offre collectée et un run de connecteur liés à un user", async () => {
    const campaign = await prisma.campaign.create({
      data: {
        userId,
        slug: "alternance-data-hdf",
        romeCodes: ["M1403", "M1805"],
        keywords: ["data analyst", "BI"],
        contractTypes: ["APPRENTISSAGE", "PROFESSIONNALISATION"],
        schedule: "0 7 * * *",
        config: {
          locations: [{ label: "Lille 59000", lat: 50.630951, lng: 3.045391, radiusKm: 30 }],
          targets: { smartrecruiters: ["MAZARS"] },
        },
      },
    });

    const offer = await prisma.harvestedOffer.create({
      data: {
        userId,
        campaignId: campaign.id,
        source: "smartrecruiters",
        sourceOfferId: "12345",
        canonicalUrl: "https://jobs.smartrecruiters.com/MAZARS/12345",
        title: "Alternant Data Analyst",
        companyName: "Mazars",
        companyNormalizedName: "mazars",
        locationLabel: "Lille",
        city: "Lille",
        contractType: "APPRENTISSAGE",
        romeCodes: ["M1403"],
        descriptionText: "Description de l'offre.",
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
        lifecycle: "ACTIVE",
        dedupKey: "mazars|alternant-data-analyst|lille",
        sourceRefs: [{ source: "smartrecruiters", sourceOfferId: "12345", canonicalUrl: "https://jobs.smartrecruiters.com/MAZARS/12345" }],
        rawPayload: { title: "Alternant Data Analyst" },
      },
    });

    const run = await prisma.connectorRun.create({
      data: {
        campaignId: campaign.id,
        connectorId: "smartrecruiters",
        startedAt: new Date(),
        finishedAt: new Date(),
        rawCount: 10,
        normalizedCount: 9,
        rejectedCount: 1,
        httpStatusesSeen: [200],
        ok: true,
      },
    });

    expect(offer.campaignId).toBe(campaign.id);
    expect(run.campaignId).toBe(campaign.id);

    const found = await prisma.harvestedOffer.findUnique({ where: { id: offer.id } });
    expect(found?.userId).toBe(userId);

    await prisma.connectorRun.delete({ where: { id: run.id } });
    await prisma.harvestedOffer.delete({ where: { id: offer.id } });
    await prisma.campaign.delete({ where: { id: campaign.id } });
  });

  it("refuse deux offres avec la même dedupKey pour le même user", async () => {
    const campaign = await prisma.campaign.create({
      data: { userId, slug: "dedup-test", romeCodes: [], keywords: [], contractTypes: [], config: {} },
    });
    const base = {
      userId,
      campaignId: campaign.id,
      source: "smartrecruiters",
      sourceOfferId: "1",
      canonicalUrl: "https://example.com/1",
      title: "Offre",
      companyName: "Acme",
      companyNormalizedName: "acme",
      locationLabel: "Lille",
      city: "Lille",
      contractType: "APPRENTISSAGE" as const,
      romeCodes: [],
      descriptionText: "desc",
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
      lifecycle: "ACTIVE" as const,
      dedupKey: "dup-key",
      sourceRefs: [],
      rawPayload: {},
    };

    const first = await prisma.harvestedOffer.create({ data: base });

    await expect(
      prisma.harvestedOffer.create({ data: { ...base, sourceOfferId: "2", canonicalUrl: "https://example.com/2" } }),
    ).rejects.toThrow();

    await prisma.harvestedOffer.delete({ where: { id: first.id } });
    await prisma.campaign.delete({ where: { id: campaign.id } });
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run lib/__tests__/harvester-schema.test.ts`
Expected: FAIL — `Property 'campaign' does not exist on type 'PrismaClient'` (le modèle n'existe pas encore dans le client généré).

- [ ] **Step 3: Ajouter les enums et modèles à `prisma/schema.prisma`**

Ajouter à la fin du fichier (après le modèle `StatusHistory`) :

```prisma
enum OfferContractType {
  APPRENTISSAGE
  PROFESSIONNALISATION
  STAGE
  AUTRE
}

enum OfferRemotePolicy {
  ONSITE
  HYBRID
  REMOTE
  UNKNOWN
}

enum OfferLifecycle {
  ACTIVE
  EXPIRED
  DEAD_LINK
}

model Campaign {
  id            String              @id @default(uuid())
  userId        String
  user          User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  slug          String
  romeCodes     String[]
  keywords      String[]
  contractTypes OfferContractType[]
  schedule      String?
  // Configuration hétérogène par connecteur (locations, targets par source) —
  // voir le format d'origine dans job-harvester/config/campaigns.yaml. Reste
  // en Json car la forme varie par connecteur et n'est jamais filtrée en SQL.
  config        Json
  createdAt     DateTime            @default(now())
  updatedAt     DateTime            @updatedAt

  connectorRuns   ConnectorRun[]
  harvestedOffers HarvestedOffer[]

  @@unique([userId, slug])
  @@index([userId])
}

model HarvestedOffer {
  id                    String             @id @default(uuid())
  userId                String
  user                  User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  campaignId            String
  campaign              Campaign           @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  source                String
  sourceOfferId         String
  originSource          String?
  canonicalUrl          String
  applyUrl              String?
  title                 String
  companyName           String
  companyNormalizedName String
  companySiret          String?
  companyWebsite        String?
  locationLabel         String
  city                  String
  postalCode            String?
  department            String?
  lat                   Float?
  lng                   Float?
  contractType          OfferContractType
  durationMonths        Int?
  startDate             String?
  romeCodes             String[]
  descriptionText       String
  descriptionHtml       String?
  // Objet déjà whitelisté par le schéma Zod du connecteur — jamais le
  // payload brut de l'API source (ADR-0004 job-harvester, anti-PII).
  salary                Json?
  remotePolicy          OfferRemotePolicy?
  postedAt              String?
  expiresAt             String?
  firstSeenAt           DateTime
  lastSeenAt            DateTime
  lifecycle             OfferLifecycle
  dedupKey              String
  sourceRefs            Json
  rawPayload            Json
  importedJobId         String?            @unique
  importedJob           Job?               @relation(fields: [importedJobId], references: [id])
  createdAt             DateTime           @default(now())
  updatedAt             DateTime           @updatedAt

  @@unique([userId, dedupKey])
  @@index([userId, campaignId])
}

model ConnectorRun {
  id               String   @id @default(uuid())
  campaignId       String
  campaign         Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  connectorId      String
  startedAt        DateTime
  finishedAt       DateTime
  rawCount         Int
  normalizedCount  Int
  rejectedCount    Int
  httpStatusesSeen Int[]
  ok               Boolean
  errorMessage     String?

  @@index([campaignId])
}
```

Ajouter les relations inverses :
- Dans `model User` (`prisma/schema.prisma:17-30`), après `tags Tag[]` : `campaigns Campaign[]` et `harvestedOffers HarvestedOffer[]`.
- Dans `model Job` (`prisma/schema.prisma:59-88`), après `statusHistory StatusHistory[]` : `harvestedOffer HarvestedOffer?`.

- [ ] **Step 4: Générer et appliquer la migration**

Run: `npx prisma migrate dev --name add_harvester_models`
Expected: migration créée dans `prisma/migrations/`, appliquée sans erreur, client Prisma régénéré.

- [ ] **Step 5: Lancer le test pour vérifier qu'il passe**

Run: `npx vitest run lib/__tests__/harvester-schema.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: `prisma validate`**

Run: `npx prisma validate`
Expected: "The schema at prisma/schema.prisma is valid".

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations lib/__tests__/harvester-schema.test.ts
git commit -m "$(cat <<'EOF'
feat(db): fusionner le schéma Harvester (offres, campagnes, runs) dans Prisma (JOB-40)

HarvestedOffer/Campaign/ConnectorRun portés depuis packages/db/src/schema.ts
(Drizzle) de job-harvester, scopés par userId. application_events non porté :
fait doublon avec Job.status/StatusHistory déjà présents ici — le suivi post-
import reste porté par le modèle Job existant.
EOF
)"
```
