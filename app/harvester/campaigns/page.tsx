import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getPendingOfferCount } from "@/lib/harvester/pending-offer-count";
import { PageHeader } from "@/components/page-header";
import { HarvesterTabs } from "@/components/harvester/harvester-tabs";
import { CampaignsManager } from "@/components/harvester/campaigns-manager";

export default async function HarvesterCampaignsPage() {
  const session = await auth();
  const userId = session?.user?.id ?? "";

  const [campaigns, pendingOfferCount] = await Promise.all([
    prisma.campaign.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
    getPendingOfferCount(userId),
  ]);

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-4 p-4">
      <PageHeader
        eyebrow="Harvester"
        title="Campagnes"
        subtitle="Mots-clés, zones géographiques et types de contrat visés par chaque collecte."
      />
      <HarvesterTabs reviewQueueCount={pendingOfferCount} />
      <CampaignsManager initialCampaigns={campaigns} />
    </div>
  );
}
