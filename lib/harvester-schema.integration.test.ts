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
        sourceRefs: [
          { source: "smartrecruiters", sourceOfferId: "12345", canonicalUrl: "https://jobs.smartrecruiters.com/MAZARS/12345" },
        ],
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
      romeCodes: [] as string[],
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
