import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ARCHIVED_JOBS_SAFETY_LIMIT, STATUS } from "@/lib/constants";
import { computeArchiveStats } from "@/lib/archive-stats";
import { ArchivesView } from "@/components/archives/archives-view";
import { ArchiveStatsRow } from "@/components/archives/archive-stats-row";

export default async function ArchivesPage() {
  const session = await auth();
  const userId = session?.user?.id ?? "";

  const [jobs, totalArchived, refusedArchived, tenureSamples] = await Promise.all([
    prisma.job.findMany({
      where: { userId, archived: true },
      include: {
        tags: { include: { tag: true } },
        contacts: true,
        statusHistory: { orderBy: { changedAt: "asc" } },
      },
      orderBy: { updatedAt: "desc" },
      take: ARCHIVED_JOBS_SAFETY_LIMIT,
    }),
    // Mini-stats (JOB-97) calculées côté serveur, indépendamment de la
    // liste ci-dessus : count() est une agrégation DB ; tenureSamples ne
    // sélectionne que les deux dates nécessaires (pas les jobs complets).
    prisma.job.count({ where: { userId, archived: true } }),
    prisma.job.count({ where: { userId, archived: true, status: STATUS.REJECTED } }),
    prisma.job.findMany({
      where: { userId, archived: true },
      select: { createdAt: true, updatedAt: true },
    }),
  ]);

  const stats = computeArchiveStats(totalArchived, refusedArchived, tenureSamples);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <ArchiveStatsRow stats={stats} />
      <ArchivesView initialJobs={jobs} />
    </div>
  );
}
