import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  checkJobUrl,
  createJob,
  deleteJob,
  fetchCompanyLogo,
  importBackupJson,
} from "@/app/actions";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { safeFetch } from "@/lib/safe-fetch";
import { logger } from "@/lib/logger";
import { STATUS } from "@/lib/constants";

vi.mock("@/lib/auth/session", () => ({
  requireUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    job: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    tag: { deleteMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/safe-fetch", () => ({
  safeFetch: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

function mockAuthedAs(userId: string) {
  vi.mocked(requireUser).mockResolvedValue({
    ok: true,
    user: { id: userId, email: `${userId}@example.com`, name: null },
  });
}

describe("logging structuré des Server Actions (JOB-88)", () => {
  beforeEach(() => {
    vi.mocked(requireUser).mockReset();
    vi.mocked(prisma.job.findUnique).mockReset();
    vi.mocked(prisma.job.create).mockReset();
    vi.mocked(prisma.job.delete).mockReset();
    vi.mocked(prisma.$transaction).mockReset();
    vi.mocked(safeFetch).mockReset();
    vi.mocked(logger.error).mockReset();
    vi.mocked(logger.warn).mockReset();
  });

  it("logs the real error and userId when checkJobUrl's DB call throws", async () => {
    mockAuthedAs("user-1");
    const dbError = new Error("connection refused");
    vi.mocked(prisma.job.findUnique).mockRejectedValue(dbError);

    const result = await checkJobUrl("https://example.com/job");

    expect(result).toEqual({ ok: false, error: "Impossible de vérifier cette offre" });
    expect(logger.error).toHaveBeenCalledWith(
      "action.failed",
      expect.objectContaining({
        action: "checkJobUrl",
        userId: "user-1",
        error: "connection refused",
      })
    );
  });

  it("logs the real error when createJob's insert throws (non-duplicate failure)", async () => {
    mockAuthedAs("user-2");
    vi.mocked(prisma.job.create).mockRejectedValue(new Error("db down"));

    const result = await createJob({
      url: "https://example.com/job",
      title: "Titre",
      status: STATUS.TO_APPLY,
    });

    expect(result).toEqual({ ok: false, error: "Impossible d'enregistrer cette offre" });
    expect(logger.error).toHaveBeenCalledWith(
      "action.failed",
      expect.objectContaining({ action: "createJob", userId: "user-2", error: "db down" })
    );
  });

  it("logs the real error when deleteJob's delete throws", async () => {
    mockAuthedAs("user-3");
    vi.mocked(prisma.job.delete).mockRejectedValue(new Error("record not found"));

    const result = await deleteJob("job-1");

    expect(result).toEqual({ ok: false, error: "Impossible de supprimer l'offre" });
    expect(logger.error).toHaveBeenCalledWith(
      "action.failed",
      expect.objectContaining({ action: "deleteJob", userId: "user-3" })
    );
  });

  it("logs (without a userId) when the unauthenticated logo lookup throws", async () => {
    vi.mocked(safeFetch).mockRejectedValue(new Error("timeout"));

    const result = await fetchCompanyLogo("https://acme.com/job");

    expect(result.ok).toBe(true);
    expect(logger.warn).toHaveBeenCalledWith(
      "action.failed",
      expect.objectContaining({ action: "fetchCompanyLogo" })
    );
    const [, fields] = vi.mocked(logger.warn).mock.calls[0];
    expect(fields).not.toHaveProperty("userId");
  });

  it("logs a parse failure distinctly from a transaction failure in importBackupJson", async () => {
    mockAuthedAs("user-4");

    const parseResult = await importBackupJson("not json");
    expect(parseResult).toEqual({ ok: false, error: "Fichier JSON illisible" });
    expect(logger.error).toHaveBeenCalledWith(
      "action.failed",
      expect.objectContaining({ action: "importBackupJson.parse", userId: "user-4" })
    );
  });
});
