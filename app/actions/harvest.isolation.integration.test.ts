/**
 * Real-database isolation tests (JOB-47), mêmes conventions que
 * app/actions.isolation.integration.test.ts (JOB-107) : deux vrais
 * utilisateurs contre le Postgres local (docker-compose, JOB-82), seule
 * l'identité (requireUser) est mockée.
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

const { importHarvestedOffer } = await import("@/app/actions/harvest");

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

async function createOfferAsA(dedupKey: string) {
  const campaign = await prisma.campaign.create({
    data: {
      userId: userA.id,
      slug: `iso-import-${dedupKey}`,
      romeCodes: [],
      keywords: [],
      contractTypes: [],
      config: {},
    },
  });
  const offer = await prisma.harvestedOffer.create({
    data: {
      userId: userA.id,
      campaignId: campaign.id,
      source: "fake",
      sourceOfferId: dedupKey,
      canonicalUrl: `https://example.com/isolation-import/${dedupKey}`,
      title: "Offre A",
      companyName: "Acme",
      companyNormalizedName: "acme",
      locationLabel: "Lille",
      city: "Lille",
      contractType: "APPRENTISSAGE",
      romeCodes: [],
      descriptionText: "desc",
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
      lifecycle: "ACTIVE",
      dedupKey,
      sourceRefs: [],
      rawPayload: {},
    },
  });
  return offer.id;
}

describe("importHarvestedOffer — isolation multi-tenant (base réelle)", () => {
  beforeAll(async () => {
    userA = await prisma.user.create({ data: { email: `iso-import-a-${Date.now()}@test.local`, passwordHash: "x" } });
    userB = await prisma.user.create({ data: { email: `iso-import-b-${Date.now()}@test.local`, passwordHash: "x" } });
  });

  afterAll(async () => {
    await prisma.job.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await prisma.harvestedOffer.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await prisma.campaign.deleteMany({ where: { userId: { in: [userA.id, userB.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } });
    await prisma.$disconnect();
  });

  beforeEach(() => {
    currentUserId = "";
  });

  it("B cannot import A's collected offer", async () => {
    const offerId = await createOfferAsA("iso-import-b-blocked");
    const result = await asB(() => importHarvestedOffer({ offerId }));
    expect(result.ok).toBe(false);

    const offer = await prisma.harvestedOffer.findUnique({ where: { id: offerId } });
    expect(offer?.importedJobId).toBeNull();
    expect(await prisma.job.count({ where: { userId: userB.id } })).toBe(0);
  });

  it("A can import her own offer, and the created Job belongs to her", async () => {
    const offerId = await createOfferAsA("iso-import-a-ok");
    const result = await asA(() => importHarvestedOffer({ offerId }));
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");

    const job = await prisma.job.findUnique({ where: { id: result.data.jobId } });
    expect(job?.userId).toBe(userA.id);
  });
});
