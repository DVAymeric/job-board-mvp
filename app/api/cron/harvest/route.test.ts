import { describe, expect, it, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/cron/harvest/route";
import { prisma } from "@/lib/prisma";
import { runCampaignAcrossConnectors } from "@/lib/harvester/orchestrator";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    campaign: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/harvester/orchestrator", () => ({
  runCampaignAcrossConnectors: vi.fn(),
}));

function makeRequest(authHeader?: string): Request {
  return new Request("http://localhost/api/cron/harvest", {
    headers: authHeader ? { authorization: authHeader } : {},
  });
}

beforeEach(() => {
  vi.mocked(prisma.campaign.findMany).mockReset();
  vi.mocked(runCampaignAcrossConnectors).mockReset();
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

  it("returns 401 for the literal header 'Bearer undefined' even when CRON_SECRET is unset (JOB-56)", async () => {
    vi.stubEnv("CRON_SECRET", undefined);
    const response = await GET(makeRequest("Bearer undefined"));
    expect(response.status).toBe(401);
    expect(prisma.campaign.findMany).not.toHaveBeenCalled();
  });

  it("runs every scheduled campaign and returns a summary", async () => {
    vi.mocked(prisma.campaign.findMany).mockResolvedValue([
      { id: "c1", schedule: "0 7 * * *" },
      { id: "c2", schedule: "0 7 * * *" },
    ] as never);
    vi.mocked(runCampaignAcrossConnectors).mockResolvedValue([
      { runId: "r1", rawCount: 5, normalizedCount: 4, rejectedCount: 1, ok: true },
    ]);

    const response = await GET(makeRequest("Bearer test-secret"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ campaignsRun: 2, offersCollected: 8, campaignsFailed: 0 });
    expect(runCampaignAcrossConnectors).toHaveBeenCalledTimes(2);
    expect(prisma.campaign.findMany).toHaveBeenCalledWith({ where: { schedule: { not: null } } });
  });

  it("counts a campaign as failed without aborting the others when one throws", async () => {
    vi.mocked(prisma.campaign.findMany).mockResolvedValue([{ id: "c1", schedule: "0 7 * * *" }, { id: "c2", schedule: "0 7 * * *" }] as never);
    vi.mocked(runCampaignAcrossConnectors)
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce([{ runId: "r2", rawCount: 1, normalizedCount: 1, rejectedCount: 0, ok: true }]);

    const response = await GET(makeRequest("Bearer test-secret"));

    expect(await response.json()).toEqual({ campaignsRun: 2, offersCollected: 1, campaignsFailed: 1 });
  });
});
