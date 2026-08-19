import { BentoGrid } from "@/components/ui/bento-grid";
import { CampaignsCard } from "@/components/harvester/campaigns-card";
import { ReviewQueueCard } from "@/components/harvester/review-queue-card";
import { AboutCard } from "@/components/harvester/about-card";

interface HarvesterOverviewProps {
  campaignCount: number;
  pendingOfferCount: number;
}

export function HarvesterOverview({ campaignCount, pendingOfferCount }: HarvesterOverviewProps) {
  return (
    <BentoGrid>
      <CampaignsCard count={campaignCount} />
      <ReviewQueueCard pendingCount={pendingOfferCount} />
      <AboutCard />
    </BentoGrid>
  );
}
