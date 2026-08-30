import { describe, expect, it, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";
import {
  triggerCampaignCollection,
  importHarvestedOffer,
  ignoreHarvestedOffer,
  getConnectorsHealth,
  __resetConnectorsHealthRateLimitsForTests,
} from "@/app/actions/harvest";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { runCampaignAcrossConnectors } from "@/lib/harvester/orchestrator";
import { ALL_CONNECTORS } from "@/lib/harvester/connectors";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    campaign: { findUnique: vi.fn() },
    harvestedOffer: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    job: { create: vi.fn() },
  },
}));

vi.mock("@/lib/harvester/orchestrator", () => ({
  runCampaignAcrossConnectors: vi.fn(),
}));

vi.mock("@/lib/harvester/connectors", () => ({
  ALL_CONNECTORS: [
    { id: "fake-a", healthCheck: vi.fn() },
    { id: "fake-b", healthCheck: vi.fn() },
  ],
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

beforeEach(() => {
  vi.mocked(requireUser).mockReset();
  vi.mocked(prisma.campaign.findUnique).mockReset();
  vi.mocked(prisma.harvestedOffer.findFirst).mockReset();
  vi.mocked(prisma.harvestedOffer.findUnique).mockReset();
  vi.mocked(prisma.harvestedOffer.update).mockReset();
  vi.mocked(prisma.job.create).mockReset();
  vi.mocked(runCampaignAcrossConnectors).mockReset();
});

describe("triggerCampaignCollection", () => {
  it("returns UNAUTHENTICATED when there is no session", async () => {
    mockUnauthenticated();
    const result = await triggerCampaignCollection({ campaignId: "c1" });
    expect(result).toMatchObject({ code: "UNAUTHENTICATED" });
  });

  it("returns VALIDATION_ERROR for a blank campaignId", async () => {
    mockAuthedAs("trigger-user-validation");
    const result = await triggerCampaignCollection({ campaignId: "" });
    expect(result).toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("returns NOT_FOUND when the campaign doesn't belong to this user", async () => {
    mockAuthedAs("trigger-user-notfound");
    vi.mocked(prisma.campaign.findUnique).mockResolvedValue(null);
    const result = await triggerCampaignCollection({ campaignId: "c1" });
    expect(result).toMatchObject({ code: "NOT_FOUND" });
    expect(prisma.campaign.findUnique).toHaveBeenCalledWith({
      where: { id_userId: { id: "c1", userId: "trigger-user-notfound" } },
    });
  });

  it("runs the orchestrator against the owned campaign and returns the run summaries", async () => {
    mockAuthedAs("trigger-user-success");
    const campaign = { id: "c1", userId: "trigger-user-success" };
    vi.mocked(prisma.campaign.findUnique).mockResolvedValue(campaign as never);
    const runs = [{ runId: "r1", rawCount: 5, normalizedCount: 4, rejectedCount: 1, filteredCount: 0, ok: true }];
    vi.mocked(runCampaignAcrossConnectors).mockResolvedValue(runs);

    const result = await triggerCampaignCollection({ campaignId: "c1" });

    expect(result).toEqual({ ok: true, data: { runs } });
    expect(runCampaignAcrossConnectors).toHaveBeenCalledWith(campaign, expect.any(Array), prisma, expect.any(Object));
  });

  it("returns RATE_LIMITED after 5 triggers within the window", async () => {
    mockAuthedAs("trigger-user-ratelimit");
    vi.mocked(prisma.campaign.findUnique).mockResolvedValue({ id: "c1", userId: "trigger-user-ratelimit" } as never);
    vi.mocked(runCampaignAcrossConnectors).mockResolvedValue([]);

    for (let i = 0; i < 5; i++) {
      const ok = await triggerCampaignCollection({ campaignId: "c1" });
      expect(ok.ok).toBe(true);
    }
    const sixth = await triggerCampaignCollection({ campaignId: "c1" });
    expect(sixth).toMatchObject({ code: "RATE_LIMITED" });
  });
});

describe("importHarvestedOffer", () => {
  it("returns UNAUTHENTICATED when there is no session", async () => {
    mockUnauthenticated();
    const result = await importHarvestedOffer({ offerId: "o1" });
    expect(result).toMatchObject({ code: "UNAUTHENTICATED" });
  });

  it("returns NOT_FOUND when the offer doesn't belong to this user", async () => {
    mockAuthedAs("import-user-notfound");
    vi.mocked(prisma.harvestedOffer.findFirst).mockResolvedValue(null);
    const result = await importHarvestedOffer({ offerId: "o1" });
    expect(result).toMatchObject({ code: "NOT_FOUND" });
  });

  it("is idempotent: returns the existing jobId without creating a new Job when already imported", async () => {
    mockAuthedAs("import-user-idempotent");
    vi.mocked(prisma.harvestedOffer.findFirst).mockResolvedValue({
      id: "o1",
      userId: "import-user-idempotent",
      importedJobId: "existing-job-1",
    } as never);

    const result = await importHarvestedOffer({ offerId: "o1" });

    expect(result).toEqual({ ok: true, data: { jobId: "existing-job-1" } });
    expect(prisma.job.create).not.toHaveBeenCalled();
  });

  it("creates a Job from the offer fields and marks the offer as imported", async () => {
    mockAuthedAs("import-user-create");
    vi.mocked(prisma.harvestedOffer.findFirst).mockResolvedValue({
      id: "o1",
      userId: "import-user-create",
      importedJobId: null,
      applyUrl: "https://example.com/apply/1",
      canonicalUrl: "https://example.com/jobs/1",
      title: "Data Analyst",
      companyName: "Acme",
      descriptionText: "desc",
    } as never);
    vi.mocked(prisma.job.create).mockResolvedValue({ id: "new-job-1" } as never);

    const result = await importHarvestedOffer({ offerId: "o1" });

    expect(result).toEqual({ ok: true, data: { jobId: "new-job-1" } });
    expect(prisma.job.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "import-user-create",
          url: "https://example.com/apply/1",
          title: "Data Analyst",
          companyName: "Acme",
          status: "TO_APPLY",
          enrichmentStatus: "DONE",
        }),
      }),
    );
    expect(prisma.harvestedOffer.update).toHaveBeenCalledWith({
      where: { id: "o1" },
      data: { importedJobId: "new-job-1" },
    });
  });

  it("recovers idempotently from a concurrent double-import race (P2002 on Job creation)", async () => {
    mockAuthedAs("import-user-race");
    vi.mocked(prisma.harvestedOffer.findFirst).mockResolvedValue({
      id: "o1",
      userId: "import-user-race",
      importedJobId: null,
      applyUrl: "https://example.com/apply/1",
      canonicalUrl: "https://example.com/jobs/1",
      title: "Data Analyst",
      companyName: "Acme",
      descriptionText: "desc",
    } as never);
    vi.mocked(prisma.job.create).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", { code: "P2002", clientVersion: "test" }),
    );
    vi.mocked(prisma.harvestedOffer.findUnique).mockResolvedValue({ id: "o1", importedJobId: "winning-job-1" } as never);

    const result = await importHarvestedOffer({ offerId: "o1" });

    expect(result).toEqual({ ok: true, data: { jobId: "winning-job-1" } });
  });
});

describe("ignoreHarvestedOffer", () => {
  it("returns UNAUTHENTICATED when there is no session", async () => {
    mockUnauthenticated();
    const result = await ignoreHarvestedOffer({ offerId: "o1" });
    expect(result).toMatchObject({ code: "UNAUTHENTICATED" });
  });

  it("returns NOT_FOUND when the offer doesn't belong to this user", async () => {
    mockAuthedAs("ignore-user-notfound");
    vi.mocked(prisma.harvestedOffer.findFirst).mockResolvedValue(null);
    const result = await ignoreHarvestedOffer({ offerId: "o1" });
    expect(result).toMatchObject({ code: "NOT_FOUND" });
  });

  it("marks the offer as ignored", async () => {
    mockAuthedAs("ignore-user-ok");
    vi.mocked(prisma.harvestedOffer.findFirst).mockResolvedValue({
      id: "o1",
      userId: "ignore-user-ok",
      ignoredAt: null,
    } as never);

    const result = await ignoreHarvestedOffer({ offerId: "o1" });

    expect(result).toEqual({ ok: true, data: null });
    expect(prisma.harvestedOffer.update).toHaveBeenCalledWith({
      where: { id: "o1" },
      data: { ignoredAt: expect.any(Date) },
    });
  });

  it("is idempotent: does not call update again when the offer is already ignored", async () => {
    mockAuthedAs("ignore-user-idempotent");
    vi.mocked(prisma.harvestedOffer.findFirst).mockResolvedValue({
      id: "o1",
      userId: "ignore-user-idempotent",
      ignoredAt: new Date("2026-01-01"),
    } as never);

    const result = await ignoreHarvestedOffer({ offerId: "o1" });

    expect(result).toEqual({ ok: true, data: null });
    expect(prisma.harvestedOffer.update).not.toHaveBeenCalled();
  });
});

describe("getConnectorsHealth", () => {
  beforeEach(async () => {
    for (const connector of ALL_CONNECTORS) {
      vi.mocked(connector.healthCheck).mockReset();
    }
    await __resetConnectorsHealthRateLimitsForTests();
  });

  it("returns UNAUTHENTICATED when there is no session", async () => {
    mockUnauthenticated();
    const result = await getConnectorsHealth();
    expect(result).toMatchObject({ code: "UNAUTHENTICATED" });
  });

  it("calls healthCheck on every registered connector and returns one entry each", async () => {
    mockAuthedAs("health-user");
    vi.mocked(ALL_CONNECTORS[0]!.healthCheck).mockResolvedValue({
      connectorId: "fake-a",
      ok: true,
      latencyMs: 12,
      checkedAt: "2026-08-19T00:00:00.000Z",
    });
    vi.mocked(ALL_CONNECTORS[1]!.healthCheck).mockResolvedValue({
      connectorId: "fake-b",
      ok: false,
      latencyMs: 30,
      checkedAt: "2026-08-19T00:00:00.000Z",
      message: "HTTP 500",
    });

    const result = await getConnectorsHealth();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.health).toEqual([
      { connectorId: "fake-a", ok: true, latencyMs: 12, checkedAt: "2026-08-19T00:00:00.000Z" },
      { connectorId: "fake-b", ok: false, latencyMs: 30, checkedAt: "2026-08-19T00:00:00.000Z", message: "HTTP 500" },
    ]);
    expect(ALL_CONNECTORS[0]!.healthCheck).toHaveBeenCalledTimes(1);
    expect(ALL_CONNECTORS[1]!.healthCheck).toHaveBeenCalledTimes(1);
  });

  it("reports ok:false for a connector whose healthCheck throws, without failing the others", async () => {
    mockAuthedAs("health-user-throw");
    vi.mocked(ALL_CONNECTORS[0]!.healthCheck).mockRejectedValue(new Error("boom"));
    vi.mocked(ALL_CONNECTORS[1]!.healthCheck).mockResolvedValue({
      connectorId: "fake-b",
      ok: true,
      latencyMs: 5,
      checkedAt: "2026-08-19T00:00:00.000Z",
    });

    const result = await getConnectorsHealth();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.health[0]).toMatchObject({ connectorId: "fake-a", ok: false, message: "boom" });
    expect(result.data.health[1]).toMatchObject({ connectorId: "fake-b", ok: true });
  });

  it("returns RATE_LIMITED after too many checks within the window", async () => {
    mockAuthedAs("health-user-ratelimit");
    vi.mocked(ALL_CONNECTORS[0]!.healthCheck).mockResolvedValue({
      connectorId: "fake-a",
      ok: true,
      latencyMs: 1,
      checkedAt: "2026-08-19T00:00:00.000Z",
    });
    vi.mocked(ALL_CONNECTORS[1]!.healthCheck).mockResolvedValue({
      connectorId: "fake-b",
      ok: true,
      latencyMs: 1,
      checkedAt: "2026-08-19T00:00:00.000Z",
    });

    let lastResult;
    for (let i = 0; i < 11; i++) {
      lastResult = await getConnectorsHealth();
    }
    expect(lastResult).toMatchObject({ code: "RATE_LIMITED" });
  });

  it("returns RATE_LIMITED once the aggregate cap across all users is reached, even though each is under their own per-user limit", async () => {
    vi.mocked(ALL_CONNECTORS[0]!.healthCheck).mockResolvedValue({
      connectorId: "fake-a",
      ok: true,
      latencyMs: 1,
      checkedAt: "2026-08-19T00:00:00.000Z",
    });
    vi.mocked(ALL_CONNECTORS[1]!.healthCheck).mockResolvedValue({
      connectorId: "fake-b",
      ok: true,
      latencyMs: 1,
      checkedAt: "2026-08-19T00:00:00.000Z",
    });

    // Chaque utilisateur distinct reste sous son propre plafond (1 appel chacun, très en
    // dessous des 10/60s par utilisateur) — seul le total agrégé dépasse le plafond global,
    // qui protège les identifiants tiers partagés (env vars) contre un abus multi-comptes.
    let lastResult;
    for (let i = 0; i < 21; i++) {
      mockAuthedAs(`health-user-aggregate-${i}`);
      lastResult = await getConnectorsHealth();
    }
    expect(lastResult).toMatchObject({ code: "RATE_LIMITED" });
  });
});
