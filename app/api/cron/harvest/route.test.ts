import { describe, expect, it, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";
import { GET } from "@/app/api/cron/harvest/route";
import { prisma } from "@/lib/prisma";
import { runCampaignAcrossConnectors } from "@/lib/harvester/orchestrator";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    campaign: { findMany: vi.fn() },
    cronLock: { create: vi.fn(), deleteMany: vi.fn() },
  },
}));

vi.mock("@/lib/harvester/orchestrator", () => ({
  runCampaignAcrossConnectors: vi.fn(),
}));

function p2002() {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "test",
  });
}

function makeRequest(authHeader?: string): Request {
  return new Request("http://localhost/api/cron/harvest", {
    headers: authHeader ? { authorization: authHeader } : {},
  });
}

beforeEach(() => {
  vi.mocked(prisma.campaign.findMany).mockReset();
  vi.mocked(runCampaignAcrossConnectors).mockReset();
  vi.mocked(prisma.cronLock.create).mockReset().mockResolvedValue({} as never);
  vi.mocked(prisma.cronLock.deleteMany).mockReset().mockResolvedValue({ count: 0 } as never);
  vi.stubEnv("CRON_SECRET", "test-secret");
});

describe("GET /api/cron/harvest", () => {
  it("returns 401 when the Authorization header doesn't match CRON_SECRET", async () => {
    const response = await GET(makeRequest("Bearer wrong-secret"));
    expect(response.status).toBe(401);
    expect(prisma.campaign.findMany).not.toHaveBeenCalled();
  });

  it("returns 401 when no Authorization header is sent", async () => {
    const response = await GET(makeRequest());
    expect(response.status).toBe(401);
  });

  it("runs every scheduled campaign and returns a summary", async () => {
    vi.mocked(prisma.campaign.findMany).mockResolvedValue([
      { id: "c1", schedule: "0 7 * * *" },
      { id: "c2", schedule: "0 7 * * *" },
    ] as never);
    vi.mocked(runCampaignAcrossConnectors).mockResolvedValue([
      { runId: "r1", rawCount: 5, normalizedCount: 4, pendingCount: 4, rejectedCount: 1, filteredCount: 0, ok: true },
    ]);

    const response = await GET(makeRequest("Bearer test-secret"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ campaignsRun: 2, offersCollected: 8, campaignsFailed: 0 });
    expect(runCampaignAcrossConnectors).toHaveBeenCalledTimes(2);
    expect(prisma.campaign.findMany).toHaveBeenCalledWith({ where: { schedule: { not: null } } });
  });

  it("returns 409 and skips the run when a previous execution is still holding the lock (JOB-177)", async () => {
    vi.mocked(prisma.cronLock.create).mockRejectedValue(p2002());

    const response = await GET(makeRequest("Bearer test-secret"));

    expect(response.status).toBe(409);
    expect(prisma.campaign.findMany).not.toHaveBeenCalled();
  });

  it("releases the lock after a successful run so the next scheduled invocation can acquire it", async () => {
    vi.mocked(prisma.campaign.findMany).mockResolvedValue([]);

    await GET(makeRequest("Bearer test-secret"));

    expect(prisma.cronLock.create).toHaveBeenCalled();
    expect(prisma.cronLock.deleteMany).toHaveBeenCalled();
  });

  it("releases the lock even when a campaign run throws, so the next invocation is not blocked forever", async () => {
    vi.mocked(prisma.campaign.findMany).mockResolvedValue([{ id: "c1", schedule: "0 7 * * *" }] as never);
    vi.mocked(runCampaignAcrossConnectors).mockRejectedValue(new Error("boom"));

    await GET(makeRequest("Bearer test-secret"));

    expect(prisma.cronLock.deleteMany).toHaveBeenCalled();
  });

  it("counts a campaign as failed without aborting the others when one throws", async () => {
    vi.mocked(prisma.campaign.findMany).mockResolvedValue([{ id: "c1", schedule: "0 7 * * *" }, { id: "c2", schedule: "0 7 * * *" }] as never);
    vi.mocked(runCampaignAcrossConnectors)
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce([{ runId: "r2", rawCount: 1, normalizedCount: 1, pendingCount: 1, rejectedCount: 0, filteredCount: 0, ok: true }]);

    const response = await GET(makeRequest("Bearer test-secret"));

    expect(await response.json()).toEqual({ campaignsRun: 2, offersCollected: 1, campaignsFailed: 1 });
  });
});
