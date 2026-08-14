import { BentoCard } from "@/components/ui/bento-card";
import { BentoGrid } from "@/components/ui/bento-grid";
import type { ArchiveStats } from "@/lib/archive-stats";

export function ArchiveStatsRow({ stats }: { stats: ArchiveStats }) {
  return (
    <BentoGrid className="[grid-auto-rows:100px] md:[grid-auto-rows:110px]">
      <BentoCard label="Archives" title="Total archivé">
        <p className="font-heading text-2xl text-heading">{stats.totalArchived}</p>
      </BentoCard>
      <BentoCard label="Issue" title="Refusé">
        <p className="font-heading text-2xl text-heading">
          {stats.refusedRatePercent === null ? "—" : `${stats.refusedRatePercent}%`}
        </p>
      </BentoCard>
      <BentoCard label="Durée" title="Ancienneté moyenne">
        <p className="font-heading text-2xl text-heading">
          {stats.averageTenureDays === null ? "—" : `${stats.averageTenureDays} j`}
        </p>
      </BentoCard>
    </BentoGrid>
  );
}
