import { describe, it, expect, afterEach, afterAll, beforeAll } from "vitest";
import { randomUUID } from "node:crypto";
import { PrismaClient, type Campaign, type Prisma } from "@prisma/client";
import type { Connector } from "@/lib/harvester/connector";
import type { RawOffer } from "@/lib/harvester/harvest-query";
import type { NormalizedOffer } from "@/lib/harvester/normalized-offer";
import { exactDedupKeyFromUrl } from "@/lib/harvester/dedup-key";
import { runCampaign, runCampaignAcrossConnectors } from "@/lib/harvester/orchestrator";

const prisma = new PrismaClient();
let userId: string;
const createdCampaignIds: string[] = [];

beforeAll(async () => {
  const user = await prisma.user.create({
    data: { email: `orchestrator-test-${randomUUID()}@example.com`, passwordHash: "test-hash" },
  });
  userId = user.id;
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

async function makeCampaign(overrides: Partial<Prisma.CampaignUncheckedCreateInput> = {}): Promise<Campaign> {
  const campaign = await prisma.campaign.create({
    data: {
      userId,
      slug: `test-campaign-${randomUUID()}`,
      romeCodes: ["M1403"],
      keywords: [],
      contractTypes: ["APPRENTISSAGE"],
      config: { locations: [{ label: "Lille", lat: 50.63, lng: 3.05, radiusKm: 30 }] },
      ...overrides,
    },
  });
  createdCampaignIds.push(campaign.id);
  return campaign;
}

function makeOffer(id: string, canonicalUrl: string, overrides: Partial<NormalizedOffer> = {}): NormalizedOffer {
  return {
    id,
    source: "fake",
    sourceOfferId: id,
    canonicalUrl,
    title: "Data Analyst",
    company: { name: "Acme", normalizedName: "acme" },
    location: { label: "Lille", city: "Lille" },
    contractType: "apprentissage",
    romeCodes: ["M1403"],
    descriptionText: "desc",
    firstSeenAt: "2026-08-15T00:00:00.000Z",
    lastSeenAt: "2026-08-15T00:00:00.000Z",
    lifecycle: "active",
    dedupKey: exactDedupKeyFromUrl(canonicalUrl),
    sourceRefs: [{ source: "fake", sourceOfferId: id, canonicalUrl }],
    rawPayload: {},
    ...overrides,
  };
}

describe("runCampaign", () => {
  it("normalizes, dedups exact matches, stores offers, then records a run", async () => {
    const campaign = await makeCampaign();
    const rawOffers: RawOffer[] = [
      { source: "fake", payload: { id: "1", url: "https://example.com/jobs/1" } },
      { source: "fake", payload: { id: "1-dup", url: "https://example.com/jobs/1" } },
      { source: "fake", payload: { id: "bad" } },
    ];
    const fakeConnector: Connector = {
      id: "fake",
      tier: 0,
      supports: () => true,
      async *fetch() {
        for (const raw of rawOffers) yield raw;
      },
      normalize(raw) {
        const payload = raw.payload as { id: string; url?: string };
        if (!payload.url) throw new Error("invalid payload");
        return makeOffer(payload.id, payload.url);
      },
      async healthCheck() {
        return { connectorId: "fake", ok: true, latencyMs: 0, checkedAt: new Date().toISOString() };
      },
    };

    const summary = await runCampaign(campaign, fakeConnector, prisma, {});

    expect(summary).toMatchObject({ rawCount: 3, normalizedCount: 2, rejectedCount: 1, ok: true });
    expect(summary.errorMessage).toBeUndefined();
    expect(await prisma.harvestedOffer.count({ where: { campaignId: campaign.id } })).toBe(1);
    expect(await prisma.connectorRun.count({ where: { campaignId: campaign.id } })).toBe(1);
  });

  it("merges fuzzy duplicates (same company/title/city, different URLs) into a single row", async () => {
    const campaign = await makeCampaign();
    const firstOffer = makeOffer("a", "https://hellowork.com/jobs/1");
    const secondOffer = makeOffer("b", "https://acme.com/careers/1", {
      descriptionText: "a much longer and more complete description",
    });
    const rawOffers: RawOffer[] = [
      { source: "fake", payload: firstOffer },
      { source: "fake", payload: secondOffer },
    ];
    const fakeConnector: Connector = {
      id: "fake",
      tier: 0,
      supports: () => true,
      async *fetch() {
        for (const raw of rawOffers) yield raw;
      },
      normalize: (raw) => raw.payload as NormalizedOffer,
      async healthCheck() {
        return { connectorId: "fake", ok: true, latencyMs: 0, checkedAt: new Date().toISOString() };
      },
    };

    await runCampaign(campaign, fakeConnector, prisma, {});

    const rows = await prisma.harvestedOffer.findMany({ where: { campaignId: campaign.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.descriptionText).toBe("a much longer and more complete description");
  });

  it("records a failed run when connector.fetch throws, without rethrowing", async () => {
    const campaign = await makeCampaign();
    const brokenConnector: Connector = {
      id: "broken",
      tier: 0,
      supports: () => true,
      async *fetch() {
        throw new Error("network down");
      },
      normalize(raw) {
        return makeOffer("unused", (raw.payload as { url: string }).url);
      },
      async healthCheck() {
        return { connectorId: "broken", ok: true, latencyMs: 0, checkedAt: new Date().toISOString() };
      },
    };

    const summary = await runCampaign(campaign, brokenConnector, prisma, {});

    expect(summary).toMatchObject({ rawCount: 0, normalizedCount: 0, rejectedCount: 0, ok: false });
    expect(summary.errorMessage).toContain("network down");
    expect(await prisma.harvestedOffer.count({ where: { campaignId: campaign.id } })).toBe(0);

    const run = await prisma.connectorRun.findFirst({ where: { campaignId: campaign.id } });
    expect(run).toMatchObject({ ok: false });
    expect(run?.errorMessage).toContain("network down");
  });

  it("passes a guarded fetchImpl to the connector, not the raw global fetch (JOB-12)", async () => {
    const campaign = await makeCampaign();
    let receivedFetchImpl: typeof fetch | undefined;
    const observingConnector: Connector = {
      id: "observing",
      tier: 0,
      supports: () => true,
      async *fetch(_query, ctx) {
        receivedFetchImpl = ctx.fetchImpl;
      },
      normalize: (raw) => raw.payload as NormalizedOffer,
      async healthCheck() {
        return { connectorId: "observing", ok: true, latencyMs: 0, checkedAt: new Date().toISOString() };
      },
    };

    await runCampaign(campaign, observingConnector, prisma, {});

    expect(receivedFetchImpl).toBeDefined();
    expect(receivedFetchImpl).not.toBe(fetch);
  });
});

describe("runCampaign — post-filtre centralisé (JOB-73)", () => {
  it("rejette une offre hors-contrat même pour un connecteur tier0 sans pré-filtre", async () => {
    const campaign = await makeCampaign({ contractTypes: ["APPRENTISSAGE"] });
    const rawOffers: RawOffer[] = [{ source: "fake", payload: { id: "1", url: "https://example.com/jobs/1" } }];
    const tier0Connector: Connector = {
      id: "fake-tier0",
      tier: 0,
      supports: () => true,
      async *fetch() {
        for (const raw of rawOffers) yield raw;
      },
      normalize(raw) {
        const payload = raw.payload as { id: string; url: string };
        return makeOffer(payload.id, payload.url, { contractType: "autre" });
      },
      async healthCheck() {
        return { connectorId: "fake-tier0", ok: true, latencyMs: 0, checkedAt: new Date().toISOString() };
      },
    };

    const summary = await runCampaign(campaign, tier0Connector, prisma, {});

    expect(summary).toMatchObject({ rawCount: 1, normalizedCount: 0, rejectedCount: 1, ok: true });
    expect(await prisma.harvestedOffer.count({ where: { campaignId: campaign.id } })).toBe(0);
  });

  it("rejette une offre hors mots-clés pour un connecteur tier1 sans pré-filtre mots-clés", async () => {
    const campaign = await makeCampaign({ keywords: ["react"] });
    const rawOffers: RawOffer[] = [{ source: "fake", payload: { id: "1", url: "https://example.com/jobs/1" } }];
    const tier1Connector: Connector = {
      id: "fake-tier1",
      tier: 1,
      supports: () => true,
      async *fetch() {
        for (const raw of rawOffers) yield raw;
      },
      normalize(raw) {
        const payload = raw.payload as { id: string; url: string };
        return makeOffer(payload.id, payload.url, { title: "Comptable", descriptionText: "Gestion de la paie" });
      },
      async healthCheck() {
        return { connectorId: "fake-tier1", ok: true, latencyMs: 0, checkedAt: new Date().toISOString() };
      },
    };

    const summary = await runCampaign(campaign, tier1Connector, prisma, {});

    expect(summary).toMatchObject({ rawCount: 1, normalizedCount: 0, rejectedCount: 1, ok: true });
    expect(await prisma.harvestedOffer.count({ where: { campaignId: campaign.id } })).toBe(0);
  });

  it("rejette une offre hors localisation (département différent de la campagne)", async () => {
    const campaign = await makeCampaign({
      config: { locations: [{ label: "Lille 59000", lat: 50.63, lng: 3.05, radiusKm: 30 }] },
    });
    const rawOffers: RawOffer[] = [{ source: "fake", payload: { id: "1", url: "https://example.com/jobs/1" } }];
    const fakeConnector: Connector = {
      id: "fake-tier0",
      tier: 0,
      supports: () => true,
      async *fetch() {
        for (const raw of rawOffers) yield raw;
      },
      normalize(raw) {
        const payload = raw.payload as { id: string; url: string };
        return makeOffer(payload.id, payload.url, { location: { label: "Paris 75001", city: "Paris", department: "75" } });
      },
      async healthCheck() {
        return { connectorId: "fake-tier0", ok: true, latencyMs: 0, checkedAt: new Date().toISOString() };
      },
    };

    const summary = await runCampaign(campaign, fakeConnector, prisma, {});

    expect(summary).toMatchObject({ rawCount: 1, normalizedCount: 0, rejectedCount: 1, ok: true });
    expect(await prisma.harvestedOffer.count({ where: { campaignId: campaign.id } })).toBe(0);
  });

  it("persiste une offre conforme à contrat/mots-clés/localisation", async () => {
    const campaign = await makeCampaign({ keywords: ["react"] });
    const rawOffers: RawOffer[] = [{ source: "fake", payload: { id: "1", url: "https://example.com/jobs/1" } }];
    const fakeConnector: Connector = {
      id: "fake-tier0",
      tier: 0,
      supports: () => true,
      async *fetch() {
        for (const raw of rawOffers) yield raw;
      },
      normalize(raw) {
        const payload = raw.payload as { id: string; url: string };
        return makeOffer(payload.id, payload.url, { title: "Développeur React" });
      },
      async healthCheck() {
        return { connectorId: "fake-tier0", ok: true, latencyMs: 0, checkedAt: new Date().toISOString() };
      },
    };

    const summary = await runCampaign(campaign, fakeConnector, prisma, {});

    expect(summary).toMatchObject({ rawCount: 1, normalizedCount: 1, rejectedCount: 0, ok: true });
    expect(await prisma.harvestedOffer.count({ where: { campaignId: campaign.id } })).toBe(1);
  });
});

describe("runCampaign — locationScoped connectors", () => {
  it("calls fetch exactly once across multiple campaign locations when locationScoped is false", async () => {
    const campaign = await makeCampaign({
      config: {
        locations: [
          { label: "Lille", lat: 50.63, lng: 3.05, radiusKm: 30 },
          { label: "Amiens", lat: 49.9, lng: 2.29, radiusKm: 30 },
        ],
      },
    });
    let fetchCallCount = 0;
    const scopedConnector: Connector = {
      id: "scoped-fake",
      tier: 1,
      locationScoped: false,
      supports: () => true,
      async *fetch() {
        fetchCallCount += 1;
      },
      normalize: (raw) => raw.payload as NormalizedOffer,
      async healthCheck() {
        return { connectorId: "scoped-fake", ok: true, latencyMs: 0, checkedAt: new Date().toISOString() };
      },
    };

    await runCampaign(campaign, scopedConnector, prisma, {});

    expect(fetchCallCount).toBe(1);
  });

  it("calls fetch once per location when locationScoped is absent (default true)", async () => {
    const campaign = await makeCampaign({
      config: {
        locations: [
          { label: "Lille", lat: 50.63, lng: 3.05, radiusKm: 30 },
          { label: "Amiens", lat: 49.9, lng: 2.29, radiusKm: 30 },
        ],
      },
    });
    let fetchCallCount = 0;
    const defaultConnector: Connector = {
      id: "default-fake",
      tier: 0,
      supports: () => true,
      async *fetch() {
        fetchCallCount += 1;
      },
      normalize: (raw) => raw.payload as NormalizedOffer,
      async healthCheck() {
        return { connectorId: "default-fake", ok: true, latencyMs: 0, checkedAt: new Date().toISOString() };
      },
    };

    await runCampaign(campaign, defaultConnector, prisma, {});

    expect(fetchCallCount).toBe(2);
  });
});

describe("runCampaignAcrossConnectors", () => {
  it("runs only the connectors that support the campaign and returns one summary each", async () => {
    const campaign = await makeCampaign();
    const supported: Connector = {
      id: "supported",
      tier: 0,
      supports: () => true,
      async *fetch() {},
      normalize: (raw) => raw.payload as NormalizedOffer,
      async healthCheck() {
        return { connectorId: "supported", ok: true, latencyMs: 0, checkedAt: new Date().toISOString() };
      },
    };
    const unsupported: Connector = {
      id: "unsupported",
      tier: 0,
      supports: () => false,
      async *fetch() {},
      normalize: (raw) => raw.payload as NormalizedOffer,
      async healthCheck() {
        return { connectorId: "unsupported", ok: true, latencyMs: 0, checkedAt: new Date().toISOString() };
      },
    };

    const summaries = await runCampaignAcrossConnectors(campaign, [supported, unsupported], prisma, {});

    expect(summaries).toHaveLength(1);
  });

  it("returns an empty array when no connector supports the campaign", async () => {
    const campaign = await makeCampaign();
    const unsupported: Connector = {
      id: "unsupported",
      tier: 0,
      supports: () => false,
      async *fetch() {},
      normalize: (raw) => raw.payload as NormalizedOffer,
      async healthCheck() {
        return { connectorId: "unsupported", ok: true, latencyMs: 0, checkedAt: new Date().toISOString() };
      },
    };

    const summaries = await runCampaignAcrossConnectors(campaign, [unsupported], prisma, {});

    expect(summaries).toEqual([]);
  });
});
