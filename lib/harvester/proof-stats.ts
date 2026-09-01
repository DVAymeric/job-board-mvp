import { prisma } from "@/lib/prisma";
import { getSourceLabel } from "@/lib/harvester/source-labels";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export interface HarvesterProofStats {
  totalOffers: number;
  newThisWeek: number;
  sourceLabels: string[];
}

/**
 * Chiffres de la bande de preuve de la homepage (JOB-140) : agrégats
 * globaux, tous utilisateurs confondus (le Harvester reste un modèle par
 * utilisateur, JOB-136 — ceci n'est pas un pool d'offres partagé accessible
 * à un visiteur, seulement une preuve de valeur "voici ce que le Harvester
 * trouve pour ses utilisatrices et utilisateurs").
 */
export async function getHarvesterProofStats(): Promise<HarvesterProofStats> {
  const since = new Date(Date.now() - WEEK_MS);

  const [totalOffers, newThisWeek, sourceRows] = await Promise.all([
    prisma.harvestedOffer.count(),
    prisma.harvestedOffer.count({ where: { firstSeenAt: { gte: since } } }),
    prisma.harvestedOffer.findMany({
      distinct: ["source"],
      select: { source: true },
      orderBy: { source: "asc" },
    }),
  ]);

  const sourceLabels = sourceRows.map((row) => getSourceLabel(row.source));

  return { totalOffers, newThisWeek, sourceLabels };
}
