import { describe, expect, it, vi, beforeEach } from "vitest";
import { getSearchableOffers } from "@/lib/search/offers";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    harvestedOffer: { findMany: vi.fn() },
  },
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

function makeHarvestedOffer(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "offer-1",
    title: "Chargé·e de recrutement",
    companyName: "Atelier Nova",
    locationLabel: "Reims (51)",
    contractType: "APPRENTISSAGE",
    remotePolicy: "HYBRID",
    postedAt: null,
    firstSeenAt: new Date("2026-08-01T00:00:00.000Z"),
    applyUrl: "https://example.com/apply/1",
    canonicalUrl: "https://example.com/offre/1",
    ...overrides,
  };
}

beforeEach(() => {
  vi.mocked(prisma.harvestedOffer.findMany).mockReset();
});

describe("getSearchableOffers", () => {
  it("maps harvested offers into searchable offers with French contract/remote labels", async () => {
    vi.mocked(prisma.harvestedOffer.findMany).mockResolvedValue([makeHarvestedOffer()] as never);

    const result = await getSearchableOffers("user-1", 100);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok result");
    expect(result.offers).toHaveLength(1);
    expect(result.offers[0].result.title).toBe("Chargé·e de recrutement");
    expect(result.offers[0].result.contractType).toBe("Apprentissage");
    expect(result.offers[0].result.tags).toEqual(["Hybride"]);
    expect(result.offers[0].keywordHaystack).toBe("chargé·e de recrutement atelier nova");
    expect(result.offers[0].rawContractType).toBe("APPRENTISSAGE");
  });

  it("scopes the query to the given user and excludes ignored offers", async () => {
    vi.mocked(prisma.harvestedOffer.findMany).mockResolvedValue([] as never);

    await getSearchableOffers("user-1", 100);

    expect(prisma.harvestedOffer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1", ignoredAt: null },
      })
    );
  });

  it("returns a clear, non-technical error when the database call fails", async () => {
    vi.mocked(prisma.harvestedOffer.findMany).mockRejectedValue(new Error("connection refused"));

    const result = await getSearchableOffers("user-1", 100);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected error result");
    expect(result.error).not.toMatch(/connection refused/i);
    expect(result.error.length).toBeGreaterThan(0);
  });
});
