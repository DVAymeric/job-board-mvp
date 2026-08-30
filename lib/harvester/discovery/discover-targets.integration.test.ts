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
      user: { connect: { id: forUserId } },
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

    // Le point de ce test est "never re-probes" (probed: 0) : le fetchImpl qui lève une
    // exception au moindre appel réseau le garantit. `found` n'est volontairement pas
    // vérifié ici — la création d'une DiscoveredTarget pour CET utilisateur à partir d'un
    // hit déjà connu d'un AUTRE utilisateur est le comportement attendu (cache global,
    // file de revue par utilisateur) et fait l'objet du test suivant.
    expect(summary.probed).toBe(0);
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
