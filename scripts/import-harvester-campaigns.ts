// Script ponctuel (JOB-44) : reprend les campagnes du config/campaigns.yaml
// statique de job-harvester vers le modèle Campaign en base. À exécuter une
// fois par utilisateur migrant depuis l'ancien outil, puis à supprimer —
// plus aucune lecture de campaigns.yaml au runtime après le ticket 6.
//
// Usage : npx tsx scripts/import-harvester-campaigns.ts <chemin-vers-campaigns.yaml> <userId>
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { PrismaClient } from "@prisma/client";
import { CampaignsFileSchema, mapYamlCampaignToCreateInput } from "@/lib/harvester/campaign-config";

export async function importHarvesterCampaigns(
  filePath: string,
  userId: string,
  prisma: Pick<PrismaClient, "campaign">
): Promise<{ imported: string[]; skipped: Array<{ slug: string; reason: string }> }> {
  const raw = readFileSync(filePath, "utf-8");
  const { campaigns } = CampaignsFileSchema.parse(parse(raw));

  const imported: string[] = [];
  const skipped: Array<{ slug: string; reason: string }> = [];

  for (const config of campaigns) {
    try {
      await prisma.campaign.create({ data: mapYamlCampaignToCreateInput(config, userId) });
      imported.push(config.id);
    } catch (error) {
      skipped.push({
        slug: config.id,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { imported, skipped };
}

async function main() {
  const [, , filePath, userId] = process.argv;
  if (!filePath || !userId) {
    throw new Error("usage: import-harvester-campaigns.ts <chemin-vers-campaigns.yaml> <userId>");
  }
  const prisma = new PrismaClient();
  try {
    const result = await importHarvesterCampaigns(filePath, userId, prisma);
    console.log(`Campagnes importées : ${result.imported.join(", ") || "(aucune)"}`);
    if (result.skipped.length > 0) {
      console.warn(
        `Campagnes ignorées (déjà existantes ou en erreur) : ${result.skipped
          .map((s) => `${s.slug} (${s.reason})`)
          .join(", ")}`,
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.endsWith("import-harvester-campaigns.ts")) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
