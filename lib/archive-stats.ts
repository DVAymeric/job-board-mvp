export type ArchiveStats = {
  totalArchived: number;
  refusedRatePercent: number | null;
  averageTenureDays: number | null;
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Pure arithmetic over pre-aggregated inputs (JOB-97) : totalArchived et
 * refusedArchived viennent de prisma.job.count() (agrégation DB), et
 * tenureSamples d'un select minimal { createdAt, updatedAt } — pas de calcul
 * sur la liste complète déjà chargée côté client pour l'affichage.
 */
export function computeArchiveStats(
  totalArchived: number,
  refusedArchived: number,
  tenureSamples: { createdAt: Date; updatedAt: Date }[]
): ArchiveStats {
  const refusedRatePercent =
    totalArchived === 0 ? null : Math.round((refusedArchived / totalArchived) * 100);

  const averageTenureDays =
    tenureSamples.length === 0
      ? null
      : Math.round(
          tenureSamples.reduce(
            (sum, job) =>
              sum + (job.updatedAt.getTime() - job.createdAt.getTime()) / MS_PER_DAY,
            0
          ) / tenureSamples.length
        );

  return { totalArchived, refusedRatePercent, averageTenureDays };
}
