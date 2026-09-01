import { describe, expect, it, vi, beforeEach } from "vitest";
import { getHarvesterProofStats } from "@/lib/harvester/proof-stats";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    harvestedOffer: { count: vi.fn(), findMany: vi.fn() },
  },
}));

beforeEach(() => {
  vi.mocked(prisma.harvestedOffer.count).mockReset();
  vi.mocked(prisma.harvestedOffer.findMany).mockReset();
});

describe("getHarvesterProofStats", () => {
  it("returns the total offer count and the count from the last 7 days", async () => {
    vi.mocked(prisma.harvestedOffer.count).mockResolvedValueOnce(1240).mockResolvedValueOnce(87);
    vi.mocked(prisma.harvestedOffer.findMany).mockResolvedValue([] as never);

    const stats = await getHarvesterProofStats();

    expect(stats.totalOffers).toBe(1240);
    expect(stats.newThisWeek).toBe(87);
  });

  it("scopes the weekly count to the last 7 days", async () => {
    vi.mocked(prisma.harvestedOffer.count).mockResolvedValue(0);
    vi.mocked(prisma.harvestedOffer.findMany).mockResolvedValue([] as never);

    const before = Date.now();
    await getHarvesterProofStats();

    const weeklyCall = vi.mocked(prisma.harvestedOffer.count).mock.calls[1] as unknown as [
      { where: { firstSeenAt: { gte: Date } } },
    ];
    const since = weeklyCall[0].where.firstSeenAt.gte;
    expect(before - since.getTime()).toBeCloseTo(7 * 24 * 60 * 60 * 1000, -3);
  });

  it("maps distinct raw source codes to readable labels", async () => {
    vi.mocked(prisma.harvestedOffer.count).mockResolvedValue(0);
    vi.mocked(prisma.harvestedOffer.findMany).mockResolvedValue([
      { source: "francetravail" },
      { source: "workday" },
    ] as never);

    const stats = await getHarvesterProofStats();

    expect(stats.sourceLabels).toEqual(["France Travail", "Workday"]);
  });

  it("falls back to the raw code for an unrecognized source", async () => {
    vi.mocked(prisma.harvestedOffer.count).mockResolvedValue(0);
    vi.mocked(prisma.harvestedOffer.findMany).mockResolvedValue([
      { source: "some-new-connector" },
    ] as never);

    const stats = await getHarvesterProofStats();

    expect(stats.sourceLabels).toEqual(["some-new-connector"]);
  });
});
