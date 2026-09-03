import { describe, expect, it, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";
import {
  listCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  reorderCampaigns,
  searchMetiers,
} from "@/app/actions/campaigns";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { resolveLocations } from "@/lib/harvester/geocoding";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    campaign: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/harvester/geocoding", () => ({
  resolveLocations: vi.fn(),
}));

function mockAuthedAs(userId: string) {
  vi.mocked(requireUser).mockResolvedValue({
    ok: true,
    user: { id: userId, email: `${userId}@example.com`, name: null },
  });
}

function mockUnauthenticated() {
  vi.mocked(requireUser).mockResolvedValue({
    ok: false,
    error: "Vous devez être connecté pour effectuer cette action.",
    code: "UNAUTHENTICATED",
  });
}

const geocodedLille = { label: "Lille", lat: 50.630951, lng: 3.045391, radiusKm: 30 };

function mockGeocodingSuccess() {
  vi.mocked(resolveLocations).mockResolvedValue({ ok: true, locations: [geocodedLille] });
}

const validInput = {
  romeCodes: ["M1403"],
  keywords: ["data analyst"],
  contractTypes: ["APPRENTISSAGE"] as const,
  locations: [{ label: "Lille 59000", radiusKm: 30 }],
};

function p2002() {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "test",
  });
}

beforeEach(() => {
  vi.mocked(requireUser).mockReset();
  vi.mocked(prisma.campaign.findMany).mockReset();
  vi.mocked(prisma.campaign.findUnique).mockReset();
  vi.mocked(prisma.campaign.create).mockReset();
  vi.mocked(prisma.campaign.update).mockReset();
  vi.mocked(prisma.campaign.delete).mockReset();
  vi.mocked(prisma.$transaction).mockReset();
  vi.mocked(resolveLocations).mockReset();
});

describe("listCampaigns", () => {
  it("returns UNAUTHENTICATED when there is no session", async () => {
    mockUnauthenticated();
    const result = await listCampaigns();
    expect(result).toEqual({
      ok: false,
      error: "Vous devez être connecté pour effectuer cette action.",
      code: "UNAUTHENTICATED",
    });
  });

  it("returns the current user's campaigns scoped by userId", async () => {
    mockAuthedAs("user-1");
    const campaigns = [{ id: "c1", userId: "user-1", slug: "data-analyst" }];
    vi.mocked(prisma.campaign.findMany).mockResolvedValue(campaigns as never);

    const result = await listCampaigns();

    expect(result).toEqual({ ok: true, data: { campaigns } });
    expect(prisma.campaign.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1" } })
    );
  });
});

describe("createCampaign", () => {
  it("returns VALIDATION_ERROR when contractTypes is empty", async () => {
    mockAuthedAs("user-1");
    const result = await createCampaign({ ...validInput, contractTypes: [] });
    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(resolveLocations).not.toHaveBeenCalled();
  });

  it("returns VALIDATION_ERROR naming the city when geocoding can't resolve it", async () => {
    mockAuthedAs("user-1");
    vi.mocked(resolveLocations).mockResolvedValue({ ok: false, unresolvedLabel: "Villeinexistante" });

    const result = await createCampaign({ ...validInput, locations: [{ label: "Villeinexistante", radiusKm: 30 }] });

    expect(result).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(prisma.campaign.create).not.toHaveBeenCalled();
  });

  // JOB-153 : sans validation de format, un code ROME mal saisi (mauvaise longueur, pas de
  // chiffres...) échouait silencieusement à filtrer côté La Bonne Alternance/France Travail —
  // aucune erreur ne remontait jamais à l'utilisateur pour le signaler.
  it("returns VALIDATION_ERROR for a malformed ROME code", async () => {
    mockAuthedAs("user-1");
    const result = await createCampaign({ ...validInput, romeCodes: ["not-a-rome-code"] });
    expect(result).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(prisma.campaign.create).not.toHaveBeenCalled();
  });

  it("normalizes a lowercase ROME code to uppercase before saving", async () => {
    mockAuthedAs("user-1");
    mockGeocodingSuccess();
    const created = { id: "c1", userId: "user-1", slug: "data-analyst" };
    vi.mocked(prisma.campaign.create).mockResolvedValue(created as never);

    await createCampaign({ ...validInput, romeCodes: ["m1403"] });

    expect(prisma.campaign.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ romeCodes: ["M1403"] }) })
    );
  });

  it("creates the campaign with a slug generated from the keywords and geocoded locations nested under config", async () => {
    mockAuthedAs("user-1");
    mockGeocodingSuccess();
    const created = { id: "c1", userId: "user-1", slug: "data-analyst" };
    vi.mocked(prisma.campaign.create).mockResolvedValue(created as never);

    const result = await createCampaign(validInput);

    expect(result).toEqual({ ok: true, data: { campaign: created } });
    expect(prisma.campaign.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        slug: "data-analyst",
        romeCodes: ["M1403"],
        keywords: ["data analyst"],
        metiers: [],
        contractTypes: ["APPRENTISSAGE"],
        config: { locations: [geocodedLille] },
      },
    });
  });

  it("passes an optional display name through to Prisma create when provided", async () => {
    mockAuthedAs("user-1");
    mockGeocodingSuccess();
    const created = { id: "c1", userId: "user-1", slug: "data-analyst", name: "Data" };
    vi.mocked(prisma.campaign.create).mockResolvedValue(created as never);

    await createCampaign({ ...validInput, name: "Data" });

    expect(prisma.campaign.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: "Data" }) })
    );
  });

  it("retries with a numeric suffix when the generated slug collides, then succeeds", async () => {
    mockAuthedAs("user-1");
    mockGeocodingSuccess();
    const created = { id: "c1", userId: "user-1", slug: "data-analyst-2" };
    vi.mocked(prisma.campaign.create).mockRejectedValueOnce(p2002()).mockResolvedValueOnce(created as never);

    const result = await createCampaign(validInput);

    expect(result).toEqual({ ok: true, data: { campaign: created } });
    expect(prisma.campaign.create).toHaveBeenCalledTimes(2);
    expect(prisma.campaign.create).toHaveBeenNthCalledWith(1, expect.objectContaining({ data: expect.objectContaining({ slug: "data-analyst" }) }));
    expect(prisma.campaign.create).toHaveBeenNthCalledWith(2, expect.objectContaining({ data: expect.objectContaining({ slug: "data-analyst-2" }) }));
  });

  it("returns CONFLICT after exhausting slug retry attempts", async () => {
    mockAuthedAs("user-1");
    mockGeocodingSuccess();
    vi.mocked(prisma.campaign.create).mockRejectedValue(p2002());

    const result = await createCampaign(validInput);

    expect(result).toEqual({
      ok: false,
      error: "Une campagne avec cet identifiant existe déjà",
      code: "CONFLICT",
    });
    expect(vi.mocked(prisma.campaign.create).mock.calls.length).toBeGreaterThan(1);
  });
});

describe("updateCampaign", () => {
  it("scopes the update to the owning user via campaignOwnerWhere, without touching the slug", async () => {
    mockAuthedAs("user-1");
    mockGeocodingSuccess();
    const updated = { id: "c1", userId: "user-1", slug: "data-analyst" };
    vi.mocked(prisma.campaign.update).mockResolvedValue(updated as never);

    const result = await updateCampaign({ ...validInput, campaignId: "c1" });

    expect(result).toEqual({ ok: true, data: { campaign: updated } });
    expect(prisma.campaign.update).toHaveBeenCalledWith({
      where: { id_userId: { id: "c1", userId: "user-1" } },
      data: {
        romeCodes: ["M1403"],
        keywords: ["data analyst"],
        metiers: [],
        contractTypes: ["APPRENTISSAGE"],
        config: { locations: [geocodedLille] },
      },
    });
  });

  it("returns VALIDATION_ERROR naming the city when geocoding can't resolve it", async () => {
    mockAuthedAs("user-1");
    vi.mocked(resolveLocations).mockResolvedValue({ ok: false, unresolvedLabel: "Villeinexistante" });

    const result = await updateCampaign({ ...validInput, campaignId: "c1", locations: [{ label: "Villeinexistante", radiusKm: 30 }] });

    expect(result).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(prisma.campaign.update).not.toHaveBeenCalled();
  });

  it("carries over target keys the form doesn't manage (talentsoft/digitalRecruiters) while still updating workday/smartrecruiters", async () => {
    mockAuthedAs("user-1");
    mockGeocodingSuccess();
    vi.mocked(prisma.campaign.findUnique).mockResolvedValue({
      config: {
        locations: [{ label: "Paris", lat: 48.8, lng: 2.3, radiusKm: 10 }],
        targets: {
          talentsoft: ["acme.talent-soft.com"],
          digitalRecruiters: ["joinus.acme.fr"],
          workday: [{ tenant: "old", site: "old", dc: "wd1" }],
          smartrecruiters: ["OLDCORP"],
        },
      },
    } as never);
    vi.mocked(prisma.campaign.update).mockResolvedValue({ id: "c1", userId: "user-1" } as never);

    await updateCampaign({
      ...validInput,
      campaignId: "c1",
      keywords: ["data engineer"],
      targets: { workday: [{ tenant: "new", site: "new", dc: "wd3" }], smartrecruiters: ["NEWCORP"] },
    });

    expect(prisma.campaign.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          config: {
            locations: [geocodedLille],
            targets: {
              talentsoft: ["acme.talent-soft.com"],
              digitalRecruiters: ["joinus.acme.fr"],
              workday: [{ tenant: "new", site: "new", dc: "wd3" }],
              smartrecruiters: ["NEWCORP"],
            },
          },
        }),
      })
    );
  });

  it("keeps approved talentsoft targets when the form submits no targets at all", async () => {
    mockAuthedAs("user-1");
    mockGeocodingSuccess();
    vi.mocked(prisma.campaign.findUnique).mockResolvedValue({
      config: { locations: [], targets: { talentsoft: ["acme.talent-soft.com"] } },
    } as never);
    vi.mocked(prisma.campaign.update).mockResolvedValue({ id: "c1", userId: "user-1" } as never);

    await updateCampaign({ ...validInput, campaignId: "c1" });

    expect(prisma.campaign.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          config: { locations: [geocodedLille], targets: { talentsoft: ["acme.talent-soft.com"] } },
        }),
      })
    );
  });

  it("passes an optional display name through to Prisma update when provided", async () => {
    mockAuthedAs("user-1");
    mockGeocodingSuccess();
    const updated = { id: "c1", userId: "user-1", slug: "data-analyst", name: "Data" };
    vi.mocked(prisma.campaign.update).mockResolvedValue(updated as never);

    await updateCampaign({ ...validInput, campaignId: "c1", name: "Data" });

    expect(prisma.campaign.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: "Data" }) })
    );
  });
});

describe("deleteCampaign", () => {
  it("returns VALIDATION_ERROR for a blank campaignId", async () => {
    mockAuthedAs("user-1");
    const result = await deleteCampaign({ campaignId: "" });
    expect(result).toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("scopes the delete to the owning user via campaignOwnerWhere", async () => {
    mockAuthedAs("user-1");
    vi.mocked(prisma.campaign.delete).mockResolvedValue({} as never);

    const result = await deleteCampaign({ campaignId: "c1" });

    expect(result).toEqual({ ok: true, data: null });
    expect(prisma.campaign.delete).toHaveBeenCalledWith({
      where: { id_userId: { id: "c1", userId: "user-1" } },
    });
  });
});

describe("reorderCampaigns", () => {
  it("returns VALIDATION_ERROR for an empty list", async () => {
    mockAuthedAs("user-1");
    const result = await reorderCampaigns({ orderedIds: [] });
    expect(result).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("scopes each update to the owning user, persisting position as index order", async () => {
    mockAuthedAs("user-1");
    vi.mocked(prisma.$transaction).mockImplementation(async (ops: unknown) =>
      Promise.all(ops as Promise<unknown>[])
    );
    vi.mocked(prisma.campaign.update).mockResolvedValue({} as never);

    const result = await reorderCampaigns({ orderedIds: ["c2", "c1", "c3"] });

    expect(result).toEqual({ ok: true, data: null });
    expect(prisma.campaign.update).toHaveBeenNthCalledWith(1, {
      where: { id_userId: { id: "c2", userId: "user-1" } },
      data: { order: 0 },
    });
    expect(prisma.campaign.update).toHaveBeenNthCalledWith(2, {
      where: { id_userId: { id: "c1", userId: "user-1" } },
      data: { order: 1 },
    });
    expect(prisma.campaign.update).toHaveBeenNthCalledWith(3, {
      where: { id_userId: { id: "c3", userId: "user-1" } },
      data: { order: 2 },
    });
  });

  it("returns INTERNAL_ERROR without partially applying the new order when the transaction fails", async () => {
    mockAuthedAs("user-1");
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error("db down"));

    const result = await reorderCampaigns({ orderedIds: ["c1", "c2"] });

    expect(result).toMatchObject({ code: "INTERNAL_ERROR" });
  });
});

describe("searchMetiers", () => {
  it("requires authentication", async () => {
    mockUnauthenticated();
    const result = await searchMetiers("data analyst");
    expect(result.ok).toBe(false);
  });

  it("returns matches for an authenticated user", async () => {
    mockAuthedAs("user-1");
    const result = await searchMetiers("data scientist");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.matches.length).toBeGreaterThan(0);
      expect(result.data.matches.some((m) => m.romeCode === "M1405")).toBe(true);
    }
  });

  it("returns an empty match list for a query too short to search, without erroring", async () => {
    mockAuthedAs("user-1");
    const result = await searchMetiers("d");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.matches).toEqual([]);
  });
});
