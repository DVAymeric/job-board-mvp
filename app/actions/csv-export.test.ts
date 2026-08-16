import { describe, expect, it, vi, beforeEach } from "vitest";
import { exportJobsCsv } from "@/app/actions/csv-export";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/plan";

vi.mock("@/lib/auth/session", () => ({
  requireUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    job: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/plan", () => ({
  can: vi.fn(),
}));

function mockAuthedAs(userId: string) {
  vi.mocked(requireUser).mockResolvedValue({
    ok: true,
    user: { id: userId, email: `${userId}@example.com`, name: null },
  });
}

describe("exportJobsCsv — gate can() (JOB-80)", () => {
  beforeEach(() => {
    vi.mocked(requireUser).mockReset();
    vi.mocked(prisma.job.findMany).mockReset();
    vi.mocked(can).mockReset();
  });

  it("checks the csv_export entitlement for the authenticated user", async () => {
    mockAuthedAs("user-1");
    vi.mocked(can).mockResolvedValue(true);
    vi.mocked(prisma.job.findMany).mockResolvedValue([]);

    await exportJobsCsv();

    expect(can).toHaveBeenCalledWith("user-1", "csv_export");
  });

  it("returns a FORBIDDEN error and skips the query when not entitled", async () => {
    mockAuthedAs("user-1");
    vi.mocked(can).mockResolvedValue(false);

    const result = await exportJobsCsv();

    expect(result).toEqual({
      ok: false,
      error: "Fonctionnalité non disponible sur votre offre",
      code: "FORBIDDEN",
    });
    expect(prisma.job.findMany).not.toHaveBeenCalled();
  });

  it("still generates the CSV when entitled (today: always, only FREE plan exists)", async () => {
    mockAuthedAs("user-1");
    vi.mocked(can).mockResolvedValue(true);
    vi.mocked(prisma.job.findMany).mockResolvedValue([]);

    const result = await exportJobsCsv();

    expect(result.ok).toBe(true);
  });
});
