import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { importHarvesterCampaigns } from "@/scripts/import-harvester-campaigns";

const prisma = new PrismaClient();
const fixturePath = path.resolve(
  fileURLToPath(import.meta.url),
  "../../lib/harvester/__fixtures__/campaigns.yaml",
);
let userId: string;

beforeAll(async () => {
  const user = await prisma.user.create({
    data: { email: `import-campaigns-test-${randomUUID()}@example.com`, passwordHash: "test-hash" },
  });
  userId = user.id;
});

afterAll(async () => {
  await prisma.campaign.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });
  await prisma.$disconnect();
});

describe("importHarvesterCampaigns", () => {
  it("migrates both campaigns.yaml campaigns into Postgres without loss", async () => {
    const result = await importHarvesterCampaigns(fixturePath, userId, prisma);

    expect(result.imported).toEqual(["alternance-data-hdf", "alternance-devweb-hdf"]);
    expect(result.skipped).toEqual([]);

    const rows = await prisma.campaign.findMany({ where: { userId }, orderBy: { slug: "asc" } });
    expect(rows).toHaveLength(2);

    const dataCampaign = rows.find((r) => r.slug === "alternance-data-hdf")!;
    expect(dataCampaign.romeCodes).toEqual(["M1403"]);
    expect(dataCampaign.contractTypes).toEqual(["APPRENTISSAGE", "PROFESSIONNALISATION"]);
    expect(dataCampaign.schedule).toBe("0 7 * * *");
    expect(dataCampaign.config).toMatchObject({
      targets: { workday: [{ tenant: "valeo", site: "valeo_jobs", dc: "wd3" }], smartrecruiters: ["MAZARS"] },
    });
    expect((dataCampaign.config as { locations: unknown[] }).locations).toHaveLength(3);
  });

  it("reports a skipped campaign instead of throwing when the slug already exists for this user", async () => {
    const result = await importHarvesterCampaigns(fixturePath, userId, prisma);

    expect(result.imported).toEqual([]);
    expect(result.skipped.map((s) => s.slug)).toEqual(["alternance-data-hdf", "alternance-devweb-hdf"]);
  });
});
