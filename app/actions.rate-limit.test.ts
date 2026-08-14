import { describe, expect, it, vi, beforeEach } from "vitest";
import { checkJobUrl, createJob } from "@/app/actions";
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

describe("rate limiting (JOB-81)", () => {
  beforeEach(() => {
    vi.mocked(requireUser).mockReset();
    vi.mocked(prisma.job.findUnique).mockReset();
    vi.mocked(prisma.job.create).mockReset();
  });

  describe("checkJobUrl", () => {
    it("blocks a user after exceeding the per-user rate limit, with a clear error", async () => {
      const userId = "rate-limit-checkJobUrl-user";
      mockAuthedAs(userId);
      vi.mocked(prisma.job.findUnique).mockResolvedValue(null);

      let lastResult: Awaited<ReturnType<typeof checkJobUrl>> | undefined;
      for (let i = 0; i < 35; i++) {
        lastResult = await checkJobUrl(`https://example.com/rl-check-${i}`);
      }

      expect(lastResult).toBeDefined();
      expect(lastResult!.ok).toBe(false);
      if (!lastResult!.ok) {
        expect(lastResult!.error).toMatch(/trop de requêtes/i);
        expect(lastResult!.code).toBe("RATE_LIMITED");
      }
    });

    it("does not rate-limit a different user sharing the same window", async () => {
      const userA = "rate-limit-checkJobUrl-user-a";
      const userB = "rate-limit-checkJobUrl-user-b";
      vi.mocked(prisma.job.findUnique).mockResolvedValue(null);

      mockAuthedAs(userA);
      for (let i = 0; i < 25; i++) {
        await checkJobUrl(`https://example.com/rl-check-a-${i}`);
      }

      mockAuthedAs(userB);
      const result = await checkJobUrl("https://example.com/rl-check-b-0");

      expect(result.ok).toBe(true);
    });
  });

  describe("createJob", () => {
    it("blocks a user after exceeding the per-user rate limit, with a clear error", async () => {
      const userId = "rate-limit-createJob-user";
      mockAuthedAs(userId);
      vi.mocked(prisma.job.create).mockResolvedValue({ id: "job-id" } as never);

      let lastResult: Awaited<ReturnType<typeof createJob>> | undefined;
      for (let i = 0; i < 35; i++) {
        lastResult = await createJob({
          url: `https://example.com/rl-create-${i}`,
          title: "Titre",
          status: STATUS.TO_APPLY,
        });
      }

      expect(lastResult).toBeDefined();
      expect(lastResult!.ok).toBe(false);
      if (!lastResult!.ok) {
        expect(lastResult!.error).toMatch(/trop de requêtes/i);
        expect(lastResult!.code).toBe("RATE_LIMITED");
      }
    });
  });
});
