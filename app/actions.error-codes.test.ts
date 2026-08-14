import { describe, expect, it, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";
import { addTagToJob, createJob } from "@/app/actions";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { STATUS } from "@/lib/constants";

vi.mock("@/lib/auth/session", () => ({
  requireUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    job: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
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

describe("codes d'erreur machine-lisibles (JOB-59/JOB-89)", () => {
  beforeEach(() => {
    vi.mocked(requireUser).mockReset();
    vi.mocked(prisma.job.findUnique).mockReset();
    vi.mocked(prisma.job.create).mockReset();
  });

  it("code NOT_FOUND quand l'offre n'appartient pas à l'utilisateur", async () => {
    mockAuthedAs("user-1");
    vi.mocked(prisma.job.findUnique).mockResolvedValue(null);

    const result = await addTagToJob("job-1", "remote");

    expect(result).toEqual({
      ok: false,
      error: "Offre introuvable",
      code: "NOT_FOUND",
    });
  });

  it("code CONFLICT sur une contrainte d'unicité (URL déjà enregistrée)", async () => {
    mockAuthedAs("user-1");
    vi.mocked(prisma.job.create).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test",
      })
    );

    const result = await createJob({
      url: "https://example.com/job",
      title: "Titre",
      status: STATUS.TO_APPLY,
    });

    expect(result).toEqual({
      ok: false,
      error: "Cette offre a déjà été enregistrée",
      code: "CONFLICT",
    });
  });
});
