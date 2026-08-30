import { describe, expect, it, afterAll, beforeAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";

const prisma = new PrismaClient();
let userId: string;

beforeAll(async () => {
  const user = await prisma.user.create({
    data: { email: `discovery-schema-test-${randomUUID()}@example.com`, passwordHash: "test-hash" },
  });
  userId = user.id;
});

afterAll(async () => {
  await prisma.user.delete({ where: { id: userId } });
  await prisma.$disconnect();
});

describe("DiscoveryProbe / DiscoveredTarget schema", () => {
  it("writes a global probe not scoped to any user, unique per (companySlug, platform)", async () => {
    const probe = await prisma.discoveryProbe.create({
      data: { companySlug: "acme", platform: "WORKDAY", found: true, target: { tenant: "acme", site: "acme_jobs", dc: "wd3" } },
    });

    await expect(
      prisma.discoveryProbe.create({ data: { companySlug: "acme", platform: "WORKDAY", found: false, target: null } })
    ).rejects.toThrow();

    await prisma.discoveryProbe.delete({ where: { id: probe.id } });
  });

  it("creates a DiscoveredTarget scoped to a user, unique per (userId, companySlug, platform)", async () => {
    const target = await prisma.discoveredTarget.create({
      data: {
        userId,
        companySlug: "acme",
        companyName: "Acme Corp",
        platform: "SMARTRECRUITERS",
        target: "ACME",
      },
    });

    expect(target.status).toBe("PENDING");

    await expect(
      prisma.discoveredTarget.create({
        data: { userId, companySlug: "acme", companyName: "Acme Corp", platform: "SMARTRECRUITERS", target: "ACME" },
      })
    ).rejects.toThrow();

    const found = await prisma.discoveredTarget.findUnique({ where: { id: target.id } });
    expect(found?.userId).toBe(userId);

    await prisma.discoveredTarget.delete({ where: { id: target.id } });
  });
});
