import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { runCampaignAcrossConnectors } from "@/lib/harvester/orchestrator";
import { ALL_CONNECTORS } from "@/lib/harvester/connectors";
import { harvestEnv } from "@/lib/harvester/harvest-env";
import { isUniqueConstraintError } from "@/lib/prisma-errors";

// JOB-186 : comparaison à temps constant — une comparaison `!==` fuit la position du premier
// octet différent via le temps d'exécution. Peu exploitable pour un outil mono-utilisateur (le
// secret est long et généré par la plateforme), mais coûte une ligne à corriger correctement.
function isValidCronSecret(authHeader: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !authHeader) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(authHeader);
  // timingSafeEqual jette sur une longueur différente plutôt que de renvoyer false — un rejet
  // anticipé ici ne fuit que la longueur du header envoyé, pas la position d'un octet du secret.
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

const CRON_LOCK_ID = "harvest";
// Budget large d'une fonction serverless (cf. discover-targets.ts) : au-delà, un verrou n'a plus
// pu être relâché par une exécution normale — c'est le signe d'un crash/timeout plutôt que d'un
// run légitimement long, donc l'exécution suivante purge le verrou périmé avant de retenter.
const CRON_LOCK_STALE_MS = 15 * 60 * 1000;

// JOB-177 : un verrou en base plutôt qu'en mémoire process — le cron peut tourner sur des
// instances serverless distinctes qui ne partagent pas leur mémoire (même raison que JOB-178
// pour le rate limiter de déclenchement manuel).
async function acquireCronLock(): Promise<boolean> {
  await prisma.cronLock.deleteMany({
    where: { id: CRON_LOCK_ID, startedAt: { lt: new Date(Date.now() - CRON_LOCK_STALE_MS) } },
  });
  try {
    await prisma.cronLock.create({ data: { id: CRON_LOCK_ID } });
    return true;
  } catch (error) {
    if (isUniqueConstraintError(error)) return false;
    throw error;
  }
}

async function releaseCronLock(): Promise<void> {
  await prisma.cronLock.deleteMany({ where: { id: CRON_LOCK_ID } });
}

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
  if (!isValidCronSecret(authHeader)) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!(await acquireCronLock())) {
    logger.warn("cron.harvest.already_running", {});
    return new Response("Already running", { status: 409 });
  }

  try {
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
  } finally {
    await releaseCronLock();
  }
}
