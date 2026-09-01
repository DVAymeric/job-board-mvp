import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getPendingOfferCount } from "@/lib/harvester/pending-offer-count";
import { getPendingDiscoveredTargetCount } from "@/lib/harvester/pending-discovered-target-count";
import { PageHeader } from "@/components/page-header";
import { HarvesterTabs } from "@/components/harvester/harvester-tabs";
import { CampaignsManager } from "@/components/harvester/campaigns-manager";

export default async function HarvesterCampaignsPage() {
  const session = await auth();
  const userId = session?.user?.id ?? "";

  const [campaigns, pendingOfferCount, discoveredTargetCount] = await Promise.all([
    prisma.campaign.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
    getPendingOfferCount(userId),
    getPendingDiscoveredTargetCount(userId),
  ]);

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-4 p-4">
      <PageHeader
        eyebrow="Alertes emploi"
        title="Alertes"
        subtitle="Mots-clés, zones géographiques et types de contrat visés par chaque alerte."
      />
      <HarvesterTabs reviewQueueCount={pendingOfferCount} discoveredTargetCount={discoveredTargetCount} />
      <CampaignsManager initialCampaigns={campaigns} />
    </div>
  );
}
