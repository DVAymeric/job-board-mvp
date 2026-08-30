import { describe, expect, it, vi, beforeEach } from "vitest";
import { approveDiscoveredTarget, rejectDiscoveredTarget } from "@/app/actions/discovery";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requireUser: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    discoveredTarget: { findFirst: vi.fn(), update: vi.fn() },
    campaign: { findMany: vi.fn(), update: vi.fn() },
  },
}));

function mockAuthedAs(userId: string) {
  vi.mocked(requireUser).mockResolvedValue({ ok: true, user: { id: userId, email: `${userId}@example.com`, name: null } });
}

beforeEach(() => {
  vi.mocked(requireUser).mockReset();
  vi.mocked(prisma.discoveredTarget.findFirst).mockReset();
  vi.mocked(prisma.discoveredTarget.update).mockReset();
  vi.mocked(prisma.campaign.findMany).mockReset();
  vi.mocked(prisma.campaign.update).mockReset();
});

describe("approveDiscoveredTarget", () => {
  it("returns NOT_FOUND when the target doesn't belong to this user", async () => {
    mockAuthedAs("user-1");
    vi.mocked(prisma.discoveredTarget.findFirst).mockResolvedValue(null);

    const result = await approveDiscoveredTarget({ targetId: "t1" });

    expect(result).toMatchObject({ ok: false, code: "NOT_FOUND" });
    expect(prisma.campaign.findMany).not.toHaveBeenCalled();
  });

  it("adds the target to every campaign's config.targets for this user, deduplicated, and marks the row ADDED", async () => {
    mockAuthedAs("user-1");
    vi.mocked(prisma.discoveredTarget.findFirst).mockResolvedValue({
      id: "t1",
      userId: "user-1",
      platform: "SMARTRECRUITERS",
      target: "ACME",
    } as never);
    vi.mocked(prisma.campaign.findMany).mockResolvedValue([
      { id: "c1", userId: "user-1", config: { locations: [], targets: { smartrecruiters: ["OTHER"] } } },
      { id: "c2", userId: "user-1", config: { locations: [] } },
    ] as never);

    const result = await approveDiscoveredTarget({ targetId: "t1" });

    expect(result).toEqual({ ok: true, data: null });
    expect(prisma.campaign.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { config: { locations: [], targets: { smartrecruiters: ["OTHER", "ACME"] } } },
    });
    expect(prisma.campaign.update).toHaveBeenCalledWith({
      where: { id: "c2" },
      data: { config: { locations: [], targets: { smartrecruiters: ["ACME"] } } },
    });
    expect(prisma.discoveredTarget.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { status: "ADDED", reviewedAt: expect.any(Date) },
    });
  });

  it("does not duplicate the target in a campaign that already has it", async () => {
    mockAuthedAs("user-1");
    vi.mocked(prisma.discoveredTarget.findFirst).mockResolvedValue({
      id: "t1",
      userId: "user-1",
      platform: "SMARTRECRUITERS",
      target: "ACME",
    } as never);
    vi.mocked(prisma.campaign.findMany).mockResolvedValue([
      { id: "c1", userId: "user-1", config: { locations: [], targets: { smartrecruiters: ["ACME"] } } },
    ] as never);

    await approveDiscoveredTarget({ targetId: "t1" });

    expect(prisma.campaign.update).not.toHaveBeenCalled();
  });
});

describe("rejectDiscoveredTarget", () => {
  it("marks the target REJECTED without touching any campaign", async () => {
    mockAuthedAs("user-1");
    vi.mocked(prisma.discoveredTarget.findFirst).mockResolvedValue({ id: "t1", userId: "user-1" } as never);

    const result = await rejectDiscoveredTarget({ targetId: "t1" });

    expect(result).toEqual({ ok: true, data: null });
    expect(prisma.discoveredTarget.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { status: "REJECTED", reviewedAt: expect.any(Date) },
    });
    expect(prisma.campaign.findMany).not.toHaveBeenCalled();
  });

  it("returns NOT_FOUND when the target doesn't belong to this user", async () => {
    mockAuthedAs("user-1");
    vi.mocked(prisma.discoveredTarget.findFirst).mockResolvedValue(null);

    expect(await rejectDiscoveredTarget({ targetId: "t1" })).toMatchObject({ ok: false, code: "NOT_FOUND" });
  });
});
