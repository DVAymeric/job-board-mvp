import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { runCampaignAcrossConnectors } from "@/lib/harvester/orchestrator";
import { ALL_CONNECTORS } from "@/lib/harvester/connectors";
import { harvestEnv } from "@/lib/harvester/harvest-env";

// Déclenchement planifié (JOB-52) : Vercel Cron appelle cette route sur l'unique horaire
// déclaré dans vercel.json, authentifié par le header `Authorization: Bearer $CRON_SECRET` que
// Vercel ajoute automatiquement à ses propres requêtes cron quand CRON_SECRET est configuré sur
// le projet — vérifié ici pour qu'aucun tiers ne puisse déclencher une collecte à volonté.
//
// Simplification actée (vs. le scheduler `croner` d'origine, qui respectait le champ `schedule`
// de chaque campagne individuellement) : une seule cadence globale, celle de vercel.json —
// toute campagne dotée d'un `schedule` non nul est exécutée à cette cadence unique, son propre
// texte cron n'est pas ré-interprété ici. Ajouter un parseur d'expressions cron pour honorer un
// horaire par campagne serait une dépendance supplémentaire non justifiée (JOB-39, DRY strict)
// pour un outil personnel où une cadence quotidienne partagée suffit très largement — documenté
// dans docs/decision-scheduling-harvester.md.
export async function GET(request: Request): Promise<Response> {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const campaigns = await prisma.campaign.findMany({ where: { schedule: { not: null } } });
  const env = harvestEnv();
  let offersCollected = 0;
  let campaignsFailed = 0;

  for (const campaign of campaigns) {
    try {
      const runs = await runCampaignAcrossConnectors(campaign, ALL_CONNECTORS, prisma, env);
      offersCollected += runs.reduce((sum, run) => sum + run.normalizedCount, 0);
      if (runs.some((run) => !run.ok)) campaignsFailed += 1;
    } catch (error) {
      campaignsFailed += 1;
      logger.error("cron.harvest.campaign_failed", {
        campaignId: campaign.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  logger.info("cron.harvest.completed", {
    campaignsRun: campaigns.length,
    offersCollected,
    campaignsFailed,
  });

  return Response.json({ campaignsRun: campaigns.length, offersCollected, campaignsFailed });
}
