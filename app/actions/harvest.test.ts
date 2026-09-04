import { describe, expect, it, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";
import {
  triggerCampaignCollection,
  importHarvestedOffer,
  ignoreHarvestedOffer,
  clearHarvestedOffers,
  getConnectorsHealth,
  __resetConnectorsHealthRateLimitsForTests,
} from "@/app/actions/harvest";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { runCampaignAcrossConnectors } from "@/lib/harvester/orchestrator";
import { ALL_CONNECTORS } from "@/lib/harvester/connectors";
import { discoverTargets } from "@/lib/harvester/discovery/discover-targets";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// `after()` de Next planifie une tâche APRÈS l'envoi de la réponse — impossible à appeler hors
// d'un scope de requête. On la remplace par une file que les tests vident explicitement : c'est
// justement ce qui permet de vérifier que le chemin de réponse n'attend plus la découverte.
const { afterTasks } = vi.hoisted(() => ({ afterTasks: [] as Array<() => unknown> }));
vi.mock("next/server", () => ({
  after: vi.fn((task: () => unknown) => {
    afterTasks.push(task);
  }),
}));

async function drainAfterTasks() {
  const tasks = afterTasks.splice(0, afterTasks.length);
  for (const task of tasks) await task();
}

vi.mock("@/lib/auth/session", () => ({
  requireUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    campaign: { findUnique: vi.fn() },
    harvestedOffer: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
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

vi.mock("@/lib/harvester/discovery/discover-targets", () => ({
  discoverTargets: vi.fn(),
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
  afterTasks.length = 0;
  vi.mocked(revalidatePath).mockReset();
  vi.mocked(requireUser).mockReset();
  vi.mocked(prisma.campaign.findUnique).mockReset();
  vi.mocked(prisma.harvestedOffer.findFirst).mockReset();
  vi.mocked(prisma.harvestedOffer.findUnique).mockReset();
  vi.mocked(prisma.harvestedOffer.update).mockReset();
  vi.mocked(prisma.job.create).mockReset();
  vi.mocked(runCampaignAcrossConnectors).mockReset();
  vi.mocked(discoverTargets).mockReset();
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
    const runs = [{ runId: "r1", rawCount: 5, normalizedCount: 4, pendingCount: 4, rejectedCount: 1, filteredCount: 0, ok: true }];
    vi.mocked(runCampaignAcrossConnectors).mockResolvedValue(runs);

    const result = await triggerCampaignCollection({ campaignId: "c1" });

    expect(result).toEqual({ ok: true, data: { runs } });
    expect(runCampaignAcrossConnectors).toHaveBeenCalledWith(campaign, expect.any(Array), prisma, expect.any(Object));
  });

  it("schedules discoverTargets via after() instead of awaiting it on the response path", async () => {
    mockAuthedAs("trigger-user-discovery");
    const campaign = { id: "c1", userId: "trigger-user-discovery" };
    vi.mocked(prisma.campaign.findUnique).mockResolvedValue(campaign as never);
    vi.mocked(runCampaignAcrossConnectors).mockResolvedValue([]);
    vi.mocked(discoverTargets).mockResolvedValue({ probed: 2, found: 1 });

    const result = await triggerCampaignCollection({ campaignId: "c1" });

    // La réponse est déjà construite alors que la découverte n'a pas encore commencé : c'est
    // exactement ce qui la met hors de portée d'un timeout de fonction (revue finale, #2).
    expect(result).toEqual({ ok: true, data: { runs: [] } });
    expect(discoverTargets).not.toHaveBeenCalled();
    expect(afterTasks).toHaveLength(1);

    await drainAfterTasks();

    expect(discoverTargets).toHaveBeenCalledWith(prisma, "trigger-user-discovery", {});
  });

  it("revalidates the review path before the response and the discovery path only after discovery ran", async () => {
    mockAuthedAs("trigger-user-discovery-revalidate");
    vi.mocked(prisma.campaign.findUnique).mockResolvedValue({ id: "c1" } as never);
    vi.mocked(runCampaignAcrossConnectors).mockResolvedValue([]);
    vi.mocked(discoverTargets).mockResolvedValue({ probed: 0, found: 0 });

    await triggerCampaignCollection({ campaignId: "c1" });

    expect(revalidatePath).toHaveBeenCalledWith("/harvester/review");
    expect(revalidatePath).not.toHaveBeenCalledWith("/harvester/discovery");

    await drainAfterTasks();

    expect(revalidatePath).toHaveBeenCalledWith("/harvester/discovery");
  });

  it("does not fail the collection when discoverTargets throws", async () => {
    mockAuthedAs("trigger-user-discovery-fail");
    const campaign = { id: "c1", userId: "trigger-user-discovery-fail" };
    vi.mocked(prisma.campaign.findUnique).mockResolvedValue(campaign as never);
    vi.mocked(runCampaignAcrossConnectors).mockResolvedValue([]);
    vi.mocked(discoverTargets).mockRejectedValue(new Error("network down"));

    const result = await triggerCampaignCollection({ campaignId: "c1" });

    expect(result).toEqual({ ok: true, data: { runs: [] } });
    await expect(drainAfterTasks()).resolves.toBeUndefined();
  });

  it("logs the discovery summary once the scheduled run completes", async () => {
    mockAuthedAs("trigger-user-discovery-log");
    vi.mocked(prisma.campaign.findUnique).mockResolvedValue({ id: "c1" } as never);
    vi.mocked(runCampaignAcrossConnectors).mockResolvedValue([]);
    vi.mocked(discoverTargets).mockResolvedValue({ probed: 3, found: 2 });
    const infoSpy = vi.spyOn(logger, "info").mockImplementation(() => {});

    await triggerCampaignCollection({ campaignId: "c1" });
    await drainAfterTasks();

    expect(infoSpy).toHaveBeenCalledWith("harvester.discovery.completed", {
      userId: "trigger-user-discovery-log",
      probed: 3,
      found: 2,
    });
    infoSpy.mockRestore();
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

describe("clearHarvestedOffers", () => {
  it("returns UNAUTHENTICATED when there is no session", async () => {
    mockUnauthenticated();
    const result = await clearHarvestedOffers({ offerIds: ["o1"] });
    expect(result).toMatchObject({ code: "UNAUTHENTICATED" });
  });

  it("returns VALIDATION_ERROR for an empty list of ids", async () => {
    mockAuthedAs("clear-user-validation");
    const result = await clearHarvestedOffers({ offerIds: [] });
    expect(result).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(prisma.harvestedOffer.deleteMany).not.toHaveBeenCalled();
  });

  it("hard-deletes the given offers, scoped to the current user and never-imported ones", async () => {
    mockAuthedAs("clear-user-ok");
    vi.mocked(prisma.harvestedOffer.deleteMany).mockResolvedValue({ count: 3 } as never);

    const result = await clearHarvestedOffers({ offerIds: ["o1", "o2", "o3"] });

    expect(result).toEqual({ ok: true, data: { deletedCount: 3 } });
    expect(prisma.harvestedOffer.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["o1", "o2", "o3"] }, userId: "clear-user-ok", importedJobId: null },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/harvester/review");
  });

  it("returns a clear error when the deletion fails", async () => {
    mockAuthedAs("clear-user-fail");
    vi.mocked(prisma.harvestedOffer.deleteMany).mockRejectedValue(new Error("db down"));

    const result = await clearHarvestedOffers({ offerIds: ["o1"] });

    expect(result).toMatchObject({ code: "INTERNAL_ERROR" });
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
