import { describe, expect, it, vi } from "vitest";
import { getPendingDiscoveredTargetCount } from "@/lib/harvester/pending-discovered-target-count";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: { discoveredTarget: { count: vi.fn() } },
}));

describe("getPendingDiscoveredTargetCount", () => {
  it("counts only PENDING targets for the given user", async () => {
    vi.mocked(prisma.discoveredTarget.count).mockResolvedValue(3);

    const count = await getPendingDiscoveredTargetCount("user-1");

    expect(count).toBe(3);
    expect(prisma.discoveredTarget.count).toHaveBeenCalledWith({
      where: { userId: "user-1", status: "PENDING" },
    });
  });
});
