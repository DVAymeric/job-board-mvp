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
  locations: [{ label: "Lille 59000", radiusKm: 30 }],
};

// Le slug n'est plus saisi par l'appelant (JOB-59 suite) — généré côté serveur à partir des
// mots-clés, donc pas de paramètre de suffixe ici. Retourne la campagne complète (pas que l'id) :
// certains tests ont besoin de son slug réel, imprévisible d'avance en cas de collision.
async function createCampaignAsA() {
  const result = await asA(() => createCampaign(baseCampaignInput));
  if (!result.ok) throw new Error(`setup failed: ${result.error}`);
  return result.data.campaign;
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
    await createCampaignAsA();
    const result = await asB(() => listCampaigns());
    expect(result).toEqual({ ok: true, data: { campaigns: [] } });
  });

  it("createCampaign: A and B can independently use the same keywords-derived slug (scoped per user, not global)", async () => {
    const a = await asA(() => createCampaign(baseCampaignInput));
    const b = await asB(() => createCampaign(baseCampaignInput));
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
  });

  it("updateCampaign: B cannot edit A's campaign", async () => {
    const created = await createCampaignAsA();
    const result = await asB(() => updateCampaign({ ...baseCampaignInput, campaignId: created.id }));
    expect(result.ok).toBe(false);

    const campaign = await prisma.campaign.findUnique({ where: { id: created.id } });
    expect(campaign?.slug).toBe(created.slug);
  });

  it("deleteCampaign: B cannot delete A's campaign", async () => {
    const created = await createCampaignAsA();
    const result = await asB(() => deleteCampaign({ campaignId: created.id }));
    expect(result.ok).toBe(false);

    const campaign = await prisma.campaign.findUnique({ where: { id: created.id } });
    expect(campaign).not.toBeNull();
  });

  it("deleteCampaign: cascades to that user's HarvestedOffer rows only, leaving the other user's untouched", async () => {
    const campaignIdA = (await createCampaignAsA()).id;
    const campaignIdB = await asB(() => createCampaign(baseCampaignInput)).then((r) =>
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
