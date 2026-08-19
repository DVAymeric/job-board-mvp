/**
 * Real-database isolation tests (JOB-46), mêmes conventions que
 * app/actions.isolation.integration.test.ts (JOB-107) : deux vrais
 * utilisateurs contre le Postgres local (docker-compose, JOB-82), seule
 * l'identité (requireUser) est mockée. Couvre les Server Actions de
 * campagnes (JOB-44) — voir harvest.isolation.integration.test.ts (JOB-47)
 * pour l'import d'offre.
 *
 * Run with `npm run test:integration` against a running local Postgres.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";

let currentUserId = "";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireUser: async () =>
    currentUserId
      ? { ok: true as const, user: { id: currentUserId, email: "test@local", name: null } }
      : { ok: false as const, error: "Vous devez être connecté pour effectuer cette action.", code: "UNAUTHENTICATED" as const },
}));

const { listCampaigns, createCampaign, updateCampaign, deleteCampaign } = await import("@/app/actions/campaigns");

let userA: { id: string };
let userB: { id: string };

async function asA<T>(fn: () => Promise<T>): Promise<T> {
  currentUserId = userA.id;
  return fn();
}
async function asB<T>(fn: () => Promise<T>): Promise<T> {
  currentUserId = userB.id;
  return fn();
}

const baseCampaignInput = {
  romeCodes: ["M1403"],
  keywords: ["data"],
  contractTypes: ["APPRENTISSAGE"] as const,
  locations: [{ label: "Lille 59000", lat: 50.630951, lng: 3.045391, radiusKm: 30 }],
};

async function createCampaignAsA(slugSuffix: string) {
  const result = await asA(() => createCampaign({ ...baseCampaignInput, slug: `iso-${slugSuffix}` }));
  if (!result.ok) throw new Error(`setup failed: ${result.error}`);
  return result.data.campaign.id;
}

describe("Server Actions campagnes — isolation multi-tenant (base réelle)", () => {
  beforeAll(async () => {
    userA = await prisma.user.create({ data: { email: `iso-harvest-a-${Date.now()}@test.local`, passwordHash: "x" } });
    userB = await prisma.user.create({ data: { email: `iso-harvest-b-${Date.now()}@test.local`, passwordHash: "x" } });
  });

  afterAll(async () => {
    await prisma.harvestedOffer.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await prisma.campaign.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });
    await prisma.$disconnect();
  });

  beforeEach(() => {
    currentUserId = "";
  });

  it("listCampaigns: B never sees A's campaigns", async () => {
    await createCampaignAsA("list");
    const result = await asB(() => listCampaigns());
    expect(result).toEqual({ ok: true, data: { campaigns: [] } });
  });

  it("createCampaign: A and B can independently use the same slug (scoped per user, not global)", async () => {
    const a = await asA(() => createCampaign({ ...baseCampaignInput, slug: "iso-shared-slug" }));
    const b = await asB(() => createCampaign({ ...baseCampaignInput, slug: "iso-shared-slug" }));
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
  });

  it("updateCampaign: B cannot edit A's campaign", async () => {
    const campaignId = await createCampaignAsA("update");
    const result = await asB(() =>
      updateCampaign({ ...baseCampaignInput, campaignId, slug: "iso-update-hacked" }),
    );
    expect(result.ok).toBe(false);

    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    expect(campaign?.slug).toBe("iso-update");
  });

  it("deleteCampaign: B cannot delete A's campaign", async () => {
    const campaignId = await createCampaignAsA("delete");
    const result = await asB(() => deleteCampaign({ campaignId }));
    expect(result.ok).toBe(false);

    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    expect(campaign).not.toBeNull();
  });

  it("deleteCampaign: cascades to that user's HarvestedOffer rows only, leaving the other user's untouched", async () => {
    const campaignIdA = await createCampaignAsA("cascade-a");
    const campaignIdB = await asB(() => createCampaign({ ...baseCampaignInput, slug: "iso-cascade-b" })).then((r) =>
      r.ok ? r.data.campaign.id : (() => { throw new Error("setup failed"); })(),
    );

    const offerData = {
      source: "fake",
      sourceOfferId: "1",
      canonicalUrl: "https://example.com/jobs/1",
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
      sourceRefs: [],
      rawPayload: {},
    };
    await prisma.harvestedOffer.create({
      data: { ...offerData, userId: userA.id, campaignId: campaignIdA, dedupKey: "iso-cascade-a" },
    });
    await prisma.harvestedOffer.create({
      data: { ...offerData, userId: userB.id, campaignId: campaignIdB, dedupKey: "iso-cascade-b" },
    });

    const result = await asA(() => deleteCampaign({ campaignId: campaignIdA }));
    expect(result.ok).toBe(true);

    expect(await prisma.harvestedOffer.count({ where: { campaignId: campaignIdA } })).toBe(0);
    expect(await prisma.harvestedOffer.count({ where: { campaignId: campaignIdB } })).toBe(1);
  });
});
