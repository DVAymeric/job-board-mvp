import { prisma } from "@/lib/prisma";
import { computeStatusFunnel } from "@/lib/analytics";
import { FunnelChart } from "@/components/analytics/funnel-chart";

export default async function AnalyticsPage() {
  const jobs = await prisma.job.findMany({
    select: { statusHistory: { select: { status: true } } },
  });
  const funnel = computeStatusFunnel(jobs);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4">
      <div className="space-y-1">
        <h1 className="font-heading text-xl text-heading">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          {jobs.length} candidature{jobs.length > 1 ? "s" : ""} suivie
          {jobs.length > 1 ? "s" : ""} au total — taux de conversion du funnel
        </p>
      </div>
      <FunnelChart stages={funnel} />
    </div>
  );
}
