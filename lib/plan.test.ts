import { describe, expect, it, vi, beforeEach } from "vitest";
import { can } from "@/lib/plan";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: vi.fn() } },
}));

describe("can (JOB-80 — point d'extension palier payant)", () => {
  beforeEach(() => {
    vi.mocked(prisma.user.findUnique).mockReset();
  });

  it("allows a FREE-plan user (the only plan that exists today)", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ plan: "FREE" } as never);

    const allowed = await can("user-1", "csv_export");

    expect(allowed).toBe(true);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: { plan: true },
    });
  });

  it("denies an unknown/deleted user", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const allowed = await can("ghost", "csv_export");

    expect(allowed).toBe(false);
  });
});
