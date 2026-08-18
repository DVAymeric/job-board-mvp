import { describe, expect, it, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";
import {
  listCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign,
} from "@/app/actions/campaigns";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    campaign: { findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  },
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

const validInput = {
  slug: "alternance-data-hdf",
  romeCodes: ["M1403"],
  keywords: ["data analyst"],
  contractTypes: ["APPRENTISSAGE"] as const,
  locations: [{ label: "Lille 59000", lat: 50.630951, lng: 3.045391, radiusKm: 30 }],
};

beforeEach(() => {
  vi.mocked(requireUser).mockReset();
  vi.mocked(prisma.campaign.findMany).mockReset();
  vi.mocked(prisma.campaign.create).mockReset();
  vi.mocked(prisma.campaign.update).mockReset();
  vi.mocked(prisma.campaign.delete).mockReset();
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
    const campaigns = [{ id: "c1", userId: "user-1", slug: "alternance-data-hdf" }];
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
  });

  it("creates the campaign with locations/targets nested under config", async () => {
    mockAuthedAs("user-1");
    const created = { id: "c1", userId: "user-1", slug: "alternance-data-hdf" };
    vi.mocked(prisma.campaign.create).mockResolvedValue(created as never);

    const result = await createCampaign(validInput);

    expect(result).toEqual({ ok: true, data: { campaign: created } });
    expect(prisma.campaign.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        slug: "alternance-data-hdf",
        romeCodes: ["M1403"],
        keywords: ["data analyst"],
        contractTypes: ["APPRENTISSAGE"],
        config: { locations: validInput.locations },
      },
    });
  });

  it("returns CONFLICT when the slug is already taken by this user (P2002)", async () => {
    mockAuthedAs("user-1");
    vi.mocked(prisma.campaign.create).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test",
      })
    );

    const result = await createCampaign(validInput);

    expect(result).toEqual({
      ok: false,
      error: "Une campagne avec cet identifiant existe déjà",
      code: "CONFLICT",
    });
  });
});

describe("updateCampaign", () => {
  it("scopes the update to the owning user via campaignOwnerWhere", async () => {
    mockAuthedAs("user-1");
    const updated = { id: "c1", userId: "user-1", slug: "alternance-data-hdf" };
    vi.mocked(prisma.campaign.update).mockResolvedValue(updated as never);

    const result = await updateCampaign({ ...validInput, campaignId: "c1" });

    expect(result).toEqual({ ok: true, data: { campaign: updated } });
    expect(prisma.campaign.update).toHaveBeenCalledWith({
      where: { id_userId: { id: "c1", userId: "user-1" } },
      data: {
        slug: "alternance-data-hdf",
        romeCodes: ["M1403"],
        keywords: ["data analyst"],
        contractTypes: ["APPRENTISSAGE"],
        config: { locations: validInput.locations },
      },
    });
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
