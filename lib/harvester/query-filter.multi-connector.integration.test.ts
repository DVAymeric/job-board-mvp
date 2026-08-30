/**
 * JOB-70 : suite d'intégration "filtres respectés à 100%", ciblée sur le
 * post-filtre centralisé (JOB-73) exercé à travers de VRAIS connecteurs (pas
 * de mock de `Connector` comme dans `orchestrator.integration.test.ts` —
 * uniquement la couche HTTP est mockée). C'est ce niveau de test qui aurait
 * détecté le hardcoding "alternance" de Workday (JOB-74) : un mock de
 * `Connector` ne passe jamais par le vrai code de connecteur, donc ne peut
 * jamais reproduire ce genre de bug.
 *
 * `runCampaign`/`runCampaignAcrossConnectors` utilisent un `fetch` partagé
 * capturé une fois au chargement du module (`orchestrator.ts`) — on stub le
 * `fetch` global AVANT d'importer dynamiquement l'orchestrateur et le
 * registre de connecteurs, même idiome que `app/actions/harvest.isolation.integration.test.ts`.
 *
 * Run with `npm run test:integration` against a running local Postgres.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient, type Campaign } from "@prisma/client";
import { __resetTokenCacheForTests } from "@/lib/harvester/connectors/francetravail/client";

const fetchMock = vi.fn<typeof fetch>();
vi.stubGlobal("fetch", fetchMock);

const { runCampaignAcrossConnectors } = await import("@/lib/harvester/orchestrator");
const { ALL_CONNECTORS } = await import("@/lib/harvester/connectors");

const prisma = new PrismaClient();
let userId: string;
const createdCampaignIds: string[] = [];

const connectorById = Object.fromEntries(ALL_CONNECTORS.map((connector) => [connector.id, connector]));
const FRANCE_TRAVAIL_ENV = { FRANCE_TRAVAIL_CLIENT_ID: "cid", FRANCE_TRAVAIL_CLIENT_SECRET: "csecret" };
const NO_ENV = {};

beforeAll(async () => {
  const user = await prisma.user.create({
    data: { email: `query-filter-multi-connector-${randomUUID()}@example.com`, passwordHash: "test-hash" },
  });
  userId = user.id;
});

beforeEach(() => {
  fetchMock.mockReset();
  __resetTokenCacheForTests();
});

afterEach(async () => {
  await prisma.harvestedOffer.deleteMany({ where: { userId } });
  await prisma.connectorRun.deleteMany({ where: { campaignId: { in: createdCampaignIds } } });
  await prisma.campaign.deleteMany({ where: { id: { in: createdCampaignIds } } });
  createdCampaignIds.length = 0;
});

afterAll(async () => {
  await prisma.user.delete({ where: { id: userId } });
  await prisma.$disconnect();
});

async function makeCampaign(overrides: Partial<Campaign> & { config: object }): Promise<Campaign> {
  const campaign = await prisma.campaign.create({
    data: {
      userId,
      slug: `test-campaign-${randomUUID()}`,
      romeCodes: [],
      keywords: [],
      contractTypes: ["APPRENTISSAGE"],
      ...overrides,
    },
  });
  createdCampaignIds.push(campaign.id);
  return campaign;
}

async function persistedTitles(): Promise<string[]> {
  const rows = await prisma.harvestedOffer.findMany({ where: { userId } });
  return rows.map((row) => row.title).sort();
}

describe("post-filtre centralisé — tous connecteurs réels, un seul HTTP mocké (JOB-70)", () => {
  it("contrat + mots-clés : seules les offres Stage 'développeur' survivent, tous connecteurs tier1 confondus", async () => {
    const campaign = await makeCampaign({
      contractTypes: ["STAGE"],
      keywords: ["développeur"],
      config: {
        locations: [{ label: "Lille", lat: 50.63, lng: 3.05, radiusKm: 30 }],
        targets: {
          workday: [{ tenant: "acme", site: "acme_jobs", dc: "wd1" }],
          smartrecruiters: ["ACME"],
          digitalRecruiters: ["joinus.acme.fr"],
        },
      },
    });

    fetchMock.mockImplementation(async (input: string | URL | Request) => {
      const url = String(input);

      // Workday : liste puis détail par externalPath.
      if (url.endsWith("/jobs")) {
        return new Response(
          JSON.stringify({
            total: 2,
            jobPostings: [
              { title: "Stage Développeur Web", externalPath: "/job/Lille/Stage-Dev_REQ1" },
              { title: "CDI Développeur Senior", externalPath: "/job/Lille/CDI-Dev_REQ2" },
            ],
          }),
          { status: 200 },
        );
      }
      if (url.includes("/wday/cxs/")) {
        const isConforming = url.includes("REQ1");
        return new Response(
          JSON.stringify({
            jobPostingInfo: {
              title: isConforming ? "Stage Développeur Web" : "CDI Développeur Senior",
              jobDescription: "<p>Description.</p>",
              location: "Lille",
              jobReqId: isConforming ? "REQ1" : "REQ2",
            },
          }),
          { status: 200 },
        );
      }

      // SmartRecruiters : liste puis détail par id.
      if (url.includes("/postings?limit=50")) {
        return new Response(
          JSON.stringify({
            content: [
              { id: "sr1", name: "Stage Vendeur Retail H/F" },
              { id: "sr2", name: "Stage Développeur Backend H/F" },
            ],
            totalFound: 2,
          }),
          { status: 200 },
        );
      }
      if (url.includes("/postings/sr1")) {
        return new Response(JSON.stringify({ id: "sr1", name: "Stage Vendeur Retail H/F" }), { status: 200 });
      }
      if (url.includes("/postings/sr2")) {
        return new Response(JSON.stringify({ id: "sr2", name: "Stage Développeur Backend H/F" }), { status: 200 });
      }

      // DigitalRecruiters : une seule requête POST liste des job-ads.
      if (url.includes("/public/v1/careers-site/job-ads")) {
        return new Response(
          JSON.stringify({
            count: 2,
            items: [
              { job_ad_id: 1, title: "Développeur Stagiaire", contract: "Stage", location: "Lille", job: "Développement", url: "1-job-lille" },
              { job_ad_id: 2, title: "Vendeur CDI", contract: "CDI", location: "Lille", job: "Vente", url: "2-job-lille" },
            ],
          }),
          { status: 200 },
        );
      }

      throw new Error(`unmocked URL in test: ${url}`);
    });

    const connectors = [connectorById.workday!, connectorById.smartrecruiters!, connectorById.digitalrecruiters!];
    const summaries = await runCampaignAcrossConnectors(campaign, connectors, prisma, NO_ENV);

    // Aucune requête réseau ne doit avoir été envoyée avec le mot en dur "alternance" (JOB-74) —
    // Workday doit chercher "stage", pas "alternance", pour ce filtre Contrat=Stage.
    const workdaySearchBodies = fetchMock.mock.calls.filter(([input]) => String(input).endsWith("/jobs")).map(([, init]) => JSON.parse((init as RequestInit).body as string));
    expect(workdaySearchBodies.every((body) => body.searchText === "stage")).toBe(true);

    expect(await persistedTitles()).toEqual(["Développeur Stagiaire", "Stage Développeur Backend H/F", "Stage Développeur Web"]);

    const runsByConnector = Object.fromEntries(summaries.map((s) => [s.runId, s]));
    expect(Object.values(runsByConnector).some((s) => s.filteredCount > 0)).toBe(true);
    // Le "CDI Développeur Senior" (Workday) et "Vendeur CDI" (DigitalRecruiters) sont hors
    // contrat ; "Stage Vendeur Retail" (SmartRecruiters) est hors mots-clés — trois rejets par
    // le filtre centralisé, aucun par un pré-filtre connecteur (SmartRecruiters ne filtre que le
    // contrat, pas les mots-clés ; DigitalRecruiters ne filtre ni l'un ni l'autre lui-même).
    const totalFiltered = summaries.reduce((sum, s) => sum + s.filteredCount, 0);
    expect(totalFiltered).toBe(3);
  });

  it("localisation : une offre alternance hors département n'est jamais persistée, France Travail (tier0) et DigitalRecruiters (tier1) confondus", async () => {
    const campaign = await makeCampaign({
      contractTypes: ["APPRENTISSAGE"],
      config: {
        locations: [{ label: "Lille 59000", lat: 50.63, lng: 3.05, radiusKm: 30 }],
        targets: { digitalRecruiters: ["joinus.acme.fr"] },
      },
    });

    const franceTravailOffer = (overrides: Record<string, unknown>) => ({
      id: overrides.id,
      intitule: "Alternance Data Analyst",
      description: "Une alternance data.",
      dateCreation: "2026-08-01T00:00:00.000Z",
      lieuTravail: overrides.lieuTravail,
      romeCode: "M1403",
      entreprise: { nom: "Acme" },
      natureContrat: "Contrat d'apprentissage",
      alternance: true,
      origineOffre: { origine: "1" },
    });

    fetchMock.mockImplementation(async (input: string | URL | Request) => {
      const url = String(input);

      if (url.includes("access_token")) {
        return new Response(JSON.stringify({ access_token: "fake-token", token_type: "Bearer", expires_in: 1499 }), { status: 200 });
      }
      if (url.includes("offresdemploi")) {
        return new Response(
          JSON.stringify({
            resultats: [
              franceTravailOffer({ id: "ft-match", lieuTravail: { libelle: "59 - Lille", codePostal: "59000" } }),
              franceTravailOffer({ id: "ft-mismatch", lieuTravail: { libelle: "75 - Paris", codePostal: "75001" } }),
            ],
          }),
          { status: 200, headers: { "content-range": "offres 0-1/2" } },
        );
      }
      if (url.includes("/public/v1/careers-site/job-ads")) {
        return new Response(
          JSON.stringify({
            count: 2,
            items: [
              { job_ad_id: 10, title: "Alternance Magasinier", contract: "Alternance", location: "Lille", job: "Logistique", url: "10-job-59000-lille" },
              { job_ad_id: 11, title: "Alternance Magasinier", contract: "Alternance", location: "Bordeaux", job: "Logistique", url: "11-job-33300-bordeaux" },
            ],
          }),
          { status: 200 },
        );
      }

      throw new Error(`unmocked URL in test: ${url}`);
    });

    const connectors = [connectorById.francetravail!, connectorById.digitalrecruiters!];
    const summaries = await runCampaignAcrossConnectors(campaign, connectors, prisma, FRANCE_TRAVAIL_ENV);

    expect(await persistedTitles()).toEqual(["Alternance Data Analyst", "Alternance Magasinier"]);

    const rows = await prisma.harvestedOffer.findMany({ where: { userId } });
    // Aucune offre persistée ne vient de Paris/Bordeaux (hors département de la campagne) —
    // même si France Travail (tier0) et DigitalRecruiters (tier1) n'ont eux-mêmes aucune notion
    // de département/rayon dans leur propre logique de recherche/filtre.
    expect(rows.map((row) => row.locationLabel)).not.toContain("75 - Paris");
    expect(rows.every((row) => row.locationLabel !== "Bordeaux")).toBe(true);

    const totalFiltered = summaries.reduce((sum, s) => sum + s.filteredCount, 0);
    expect(totalFiltered).toBe(2);
  });
});
