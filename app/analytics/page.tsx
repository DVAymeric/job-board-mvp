import { prisma } from "@/lib/prisma";
import { computeStatusFunnel, computeMostActiveMonth } from "@/lib/analytics";
import { computeStatusCounts } from "@/lib/home-stats";
import { buildHeatmapDays } from "@/lib/heatmap";
import { STATUS } from "@/lib/constants";
import { BentoGrid } from "@/components/home/bento-grid";
import { OverviewCard } from "@/components/analytics/overview-card";
import { ConversionCard } from "@/components/analytics/conversion-card";
import { ActiveMonthCard } from "@/components/analytics/active-month-card";
import { FunnelCard } from "@/components/analytics/funnel-card";
import { HeatmapBentoCard } from "@/components/analytics/heatmap-bento-card";
import { StatusDetailCard } from "@/components/analytics/status-detail-card";

export default async function AnalyticsPage() {
  const jobs = await prisma.job.findMany({
    select: {
      status: true,
      createdAt: true,
      statusHistory: { select: { status: true } },
    },
  });

  const funnel = computeStatusFunnel(jobs);
  const statusCounts = computeStatusCounts(jobs);
  const mostActiveMonth = computeMostActiveMonth(jobs);
  const heatmapDays = buildHeatmapDays(jobs, undefined, 3);

  const appliedStage = funnel.find((s) => s.status === STATUS.APPLIED) ?? {
    count: 0,
    conversionFromPrevious: null,
  };
  const interviewStage = funnel.find((s) => s.status === STATUS.INTERVIEW) ?? {
    count: 0,
    conversionFromPrevious: null,
  };

  return (
    <div className="mx-auto w-full max-w-[1280px] p-4">
      <div className="mb-6 space-y-1">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          12 derniers mois
        </p>
        <h1 className="font-heading text-xl text-heading">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Suivi du funnel de conversion et de la régularité de vos
          candidatures.
        </p>
      </div>

      <BentoGrid>
        <OverviewCard total={jobs.length} statusCounts={statusCounts} />
        <ConversionCard
          rate={interviewStage.conversionFromPrevious}
          appliedCount={appliedStage.count}
          interviewCount={interviewStage.count}
        />
        <ActiveMonthCard month={mostActiveMonth} />
        <FunnelCard stages={funnel} />
        <HeatmapBentoCard days={heatmapDays} />
        <StatusDetailCard stages={funnel} />
      </BentoGrid>
    </div>
  );
}
