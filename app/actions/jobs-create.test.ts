import { describe, expect, it, vi, beforeEach } from "vitest";
import { createJob } from "@/app/actions/jobs-create";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { resolveCompanyLogo, resolveScrapedMetadata } from "@/app/actions/_shared";

const afterCallbacks: Array<() => unknown> = [];

vi.mock("next/server", () => ({
  after: (cb: () => unknown) => {
    afterCallbacks.push(cb);
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    job: { create: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("@/app/actions/_shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/actions/_shared")>();
  return {
    ...actual,
    resolveScrapedMetadata: vi.fn(),
    resolveCompanyLogo: vi.fn(),
    logActionError: vi.fn(),
  };
});

function mockAuthedAs(userId: string) {
  vi.mocked(requireUser).mockResolvedValue({
    ok: true,
    user: { id: userId, email: `${userId}@example.com`, name: null },
  });
}

/** Exécute et attend le dernier enrichissement programmé via after(). */
async function runLastEnrichment() {
  const cb = afterCallbacks.pop();
  if (!cb) throw new Error("no after() callback was scheduled");
  await cb();
}

describe("createJob — enrichissement asynchrone (JOB-ASYNC-ENRICH)", () => {
  beforeEach(() => {
    afterCallbacks.length = 0;
    vi.mocked(requireUser).mockReset();
    vi.mocked(prisma.job.create).mockReset();
    vi.mocked(prisma.job.update).mockReset();
    vi.mocked(resolveScrapedMetadata).mockReset();
    vi.mocked(resolveCompanyLogo).mockReset();
  });

  it("creates the job with enrichmentStatus PENDING and schedules a background enrichment when no title is given", async () => {
    mockAuthedAs("user-1");
    vi.mocked(prisma.job.create).mockResolvedValue({ id: "job-1" } as never);

    const result = await createJob({ url: "https://example.com/job", status: "TO_APPLY" });

    expect(result).toEqual({
      ok: true,
      data: { id: "job-1", enrichmentStatus: "PENDING" },
    });
    expect(prisma.job.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ enrichmentStatus: "PENDING", title: null }),
      })
    );
    expect(afterCallbacks).toHaveLength(1);
  });

  it("creates the job with enrichmentStatus DONE and does not schedule any enrichment when title and companyName are both already known", async () => {
    mockAuthedAs("user-1");
    vi.mocked(prisma.job.create).mockResolvedValue({ id: "job-1" } as never);

    const result = await createJob({
      url: "https://example.com/job",
      title: "Développeur",
      companyName: "Acme",
      status: "TO_APPLY",
    });

    expect(result).toEqual({
      ok: true,
      data: { id: "job-1", enrichmentStatus: "DONE" },
    });
    expect(afterCallbacks).toHaveLength(0);
  });

  it("marks enrichmentStatus DONE and stays without calling any scraping when only companyName is missing but a title is already known — actually still enriches for companyName", async () => {
    // title connu, companyName manquant : la candidature est déjà DONE
    // (le titre est ce qui compte pour l'affichage), mais l'enrichissement
    // tourne quand même en tâche de fond pour compléter l'entreprise/le logo.
    mockAuthedAs("user-1");
    vi.mocked(prisma.job.create).mockResolvedValue({ id: "job-1" } as never);

    const result = await createJob({
      url: "https://example.com/job",
      title: "Développeur",
      status: "TO_APPLY",
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.enrichmentStatus).toBe("DONE");
    expect(afterCallbacks).toHaveLength(1);
  });

  it("background enrichment fills in the scraped title and sets enrichmentStatus DONE on success", async () => {
    mockAuthedAs("user-1");
    vi.mocked(prisma.job.create).mockResolvedValue({ id: "job-1" } as never);
    vi.mocked(resolveScrapedMetadata).mockResolvedValue({
      title: "Développeur Backend",
      companyName: "Acme",
      descriptionText: "Description.",
    });
    vi.mocked(resolveCompanyLogo).mockResolvedValue(
      "https://logo.clearbit.com/example.com?size=128"
    );

    await createJob({ url: "https://example.com/job", status: "TO_APPLY" });
    await runLastEnrichment();

    expect(prisma.job.update).toHaveBeenCalledWith({
      where: { id: "job-1" },
      data: {
        title: "Développeur Backend",
        companyName: "Acme",
        companyLogoUrl: "https://logo.clearbit.com/example.com?size=128",
        descriptionText: "Description.",
        enrichmentStatus: "DONE",
      },
    });
  });

  it("background enrichment sets enrichmentStatus FAILED when no title could be scraped", async () => {
    mockAuthedAs("user-1");
    vi.mocked(prisma.job.create).mockResolvedValue({ id: "job-1" } as never);
    vi.mocked(resolveScrapedMetadata).mockResolvedValue({
      title: null,
      companyName: null,
      descriptionText: null,
    });
    vi.mocked(resolveCompanyLogo).mockResolvedValue(null);

    await createJob({ url: "https://example.com/job", status: "TO_APPLY" });
    await runLastEnrichment();

    expect(prisma.job.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ enrichmentStatus: "FAILED" }) })
    );
  });

  it("never lets a scraped title overwrite one already known at creation time (e.g. bookmarklet fallback)", async () => {
    mockAuthedAs("user-1");
    vi.mocked(prisma.job.create).mockResolvedValue({ id: "job-1" } as never);
    vi.mocked(resolveScrapedMetadata).mockResolvedValue({
      title: "Titre trouvé par le scraping",
      companyName: "Acme",
      descriptionText: null,
    });
    vi.mocked(resolveCompanyLogo).mockResolvedValue(null);

    await createJob({
      url: "https://example.com/job",
      title: "Titre du bookmarklet",
      status: "TO_APPLY",
    });
    await runLastEnrichment();

    expect(prisma.job.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Titre du bookmarklet",
          companyName: "Acme",
          enrichmentStatus: "DONE",
        }),
      })
    );
  });

  it("does not fail the whole enrichment job when the DB update itself errors — logs and best-effort marks FAILED", async () => {
    mockAuthedAs("user-1");
    vi.mocked(prisma.job.create).mockResolvedValue({ id: "job-1" } as never);
    vi.mocked(resolveScrapedMetadata).mockResolvedValue({
      title: "Développeur",
      companyName: null,
      descriptionText: null,
    });
    vi.mocked(resolveCompanyLogo).mockResolvedValue(null);
    vi.mocked(prisma.job.update).mockRejectedValueOnce(new Error("DB down"));
    vi.mocked(prisma.job.update).mockResolvedValueOnce({} as never);

    await createJob({ url: "https://example.com/job", status: "TO_APPLY" });
    await expect(runLastEnrichment()).resolves.toBeUndefined();

    // Le titre était déjà connu ? Non — ici il ne l'était pas, donc un
    // second essai best-effort tente de repasser en FAILED.
    expect(prisma.job.update).toHaveBeenCalledTimes(2);
    expect(prisma.job.update).toHaveBeenLastCalledWith({
      where: { id: "job-1" },
      data: { enrichmentStatus: "FAILED" },
    });
  });
});
