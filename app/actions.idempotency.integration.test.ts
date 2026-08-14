/**
 * Real-database idempotency test (JOB-91): a double-submit — double-clic ou
 * double appel réseau quasi simultané sur createJob pour la même URL — ne
 * doit jamais créer deux Job. La contrainte @@unique([userId, url]) du
 * schéma Prisma le garantit déjà côté base ; ce test prouve que le second
 * appel reçoit un résultat "gracieux" (code CONFLICT, message affichable)
 * plutôt qu'une erreur Prisma brute, et qu'un seul Job existe en base.
 *
 * Run with `npm run test:integration` against a running local Postgres.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { STATUS } from "@/lib/constants";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

let userId = "";

vi.mock("@/lib/auth/session", () => ({
  UNAUTHENTICATED_ERROR: "Vous devez être connecté pour effectuer cette action.",
  requireUser: async () => ({
    ok: true as const,
    user: { id: userId, email: "test@local", name: null },
  }),
}));

const { createJob } = await import("@/app/actions");

let user: { id: string };

beforeAll(async () => {
  user = await prisma.user.create({
    data: {
      email: `idempotency-${Date.now()}@test.local`,
      passwordHash: "irrelevant",
    },
  });
  userId = user.id;
});

afterAll(async () => {
  await prisma.job.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
  await prisma.$disconnect();
});

describe("createJob — idempotence au double-submit (JOB-91)", () => {
  it("un double-submit quasi simultané pour la même URL ne crée qu'un seul Job", async () => {
    const url = `https://example.com/idempotency-${Date.now()}`;
    const input = { url, title: "Développeur Backend", status: STATUS.TO_APPLY };

    const [first, second] = await Promise.all([createJob(input), createJob(input)]);

    const results = [first, second];
    const successes = results.filter((r) => r.ok);
    const failures = results.filter((r) => !r.ok);

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
    if (!failures[0].ok) {
      expect(failures[0].code).toBe("CONFLICT");
      expect(failures[0].error).toBe("Cette offre a déjà été enregistrée");
    }

    const jobs = await prisma.job.findMany({ where: { userId: user.id, url } });
    expect(jobs).toHaveLength(1);
  });
});
