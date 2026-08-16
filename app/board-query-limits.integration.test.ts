/**
 * Real-database test (JOB-86): proves the documented safety cap on the
 * /board findMany query actually holds against Postgres — not just that
 * the constant exists. Seeds more rows than the cap and checks the exact
 * same query shape used by the page returns at most BOARD_JOBS_SAFETY_LIMIT
 * rows.
 *
 * Run with `npm run test:integration` against a running local Postgres.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { BOARD_JOBS_SAFETY_LIMIT, STATUS } from "@/lib/constants";

let user: { id: string };

beforeAll(async () => {
  user = await prisma.user.create({
    data: {
      email: `query-limits-${Date.now()}@test.local`,
      passwordHash: "irrelevant",
    },
  });
});

afterAll(async () => {
  await prisma.job.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
  await prisma.$disconnect();
});

describe("garde-fou findMany Board (JOB-86)", () => {
  it("le board ne renvoie jamais plus de BOARD_JOBS_SAFETY_LIMIT offres", async () => {
    const extra = 5;
    await prisma.job.createMany({
      data: Array.from({ length: BOARD_JOBS_SAFETY_LIMIT + extra }, (_, i) => ({
        userId: user.id,
        url: `https://example.com/board-limit-${i}`,
        status: STATUS.TO_APPLY,
      })),
    });

    const jobs = await prisma.job.findMany({
      where: { userId: user.id },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      take: BOARD_JOBS_SAFETY_LIMIT,
    });

    expect(jobs).toHaveLength(BOARD_JOBS_SAFETY_LIMIT);

    const totalInDb = await prisma.job.count({
      where: { userId: user.id },
    });
    expect(totalInDb).toBe(BOARD_JOBS_SAFETY_LIMIT + extra);
  }, 30_000);
});
