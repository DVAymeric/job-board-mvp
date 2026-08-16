import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { computeStatusCounts, computeFollowUpSummary } from "@/lib/home-stats";
import { buildHeatmapDays } from "@/lib/heatmap";
import { BentoGrid } from "@/components/ui/bento-grid";
import { KanbanPreviewCard } from "@/components/home/kanban-preview-card";
import { FollowUpCard } from "@/components/home/follow-up-card";
import { HeatmapCard } from "@/components/home/heatmap-card";
import { AutoFetchCard } from "@/components/home/auto-fetch-card";
import { ContactsCard } from "@/components/home/contacts-card";
import { PrivacyCard } from "@/components/home/privacy-card";

const RECENT_JOBS_LIMIT = 3;

export async function BentoSection() {
  const session = await auth();
  const userId = session?.user?.id ?? "";

  const jobs = await prisma.job.findMany({
    where: { userId },
    select: {
      status: true,
      lastFollowUp: true,
      createdAt: true,
      companyLogoUrl: true,
      companyName: true,
      title: true,
      url: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const counts = computeStatusCounts(jobs);
  const followUpSummary = computeFollowUpSummary(jobs);
  const heatmapDays = buildHeatmapDays(jobs);
  const recentJobs = jobs.slice(0, RECENT_JOBS_LIMIT);

  return (
    <BentoGrid>
      <KanbanPreviewCard counts={counts} />
      <FollowUpCard summary={followUpSummary} />
      <HeatmapCard days={heatmapDays} />
      <AutoFetchCard jobs={recentJobs} />
      <ContactsCard />
      <PrivacyCard />
    </BentoGrid>
  );
}
