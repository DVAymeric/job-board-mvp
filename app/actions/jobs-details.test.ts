import { describe, expect, it, vi, beforeEach } from "vitest";
import { updateJobDetails } from "@/app/actions/jobs-details";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    job: { update: vi.fn() },
  },
}));

function mockAuthedAs(userId: string) {
  vi.mocked(requireUser).mockResolvedValue({
    ok: true,
    user: { id: userId, email: `${userId}@example.com`, name: null },
  });
}

describe("updateJobDetails — résout l'enrichissement en attente/échec (JOB-ASYNC-ENRICH)", () => {
  beforeEach(() => {
    vi.mocked(requireUser).mockReset();
    vi.mocked(prisma.job.update).mockReset();
    vi.mocked(prisma.job.update).mockResolvedValue({} as never);
  });

  it("sets enrichmentStatus to DONE when a non-empty title is saved manually", async () => {
    mockAuthedAs("user-1");

    await updateJobDetails("job-1", "Titre renseigné à la main", "Acme");

    expect(prisma.job.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Titre renseigné à la main",
          enrichmentStatus: "DONE",
        }),
      })
    );
  });

  it("does not touch enrichmentStatus when the title is cleared to empty", async () => {
    mockAuthedAs("user-1");

    await updateJobDetails("job-1", "", "Acme");

    const call = vi.mocked(prisma.job.update).mock.calls[0][0];
    expect(call.data).not.toHaveProperty("enrichmentStatus");
  });
});
