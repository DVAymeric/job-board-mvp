import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getPendingOfferCount } from "@/lib/harvester/pending-offer-count";
import { PageHeader } from "@/components/page-header";
import { HarvesterTabs } from "@/components/harvester/harvester-tabs";
import { HarvesterOverview } from "@/components/harvester/harvester-overview";

export default async function HarvesterPage() {
  const session = await auth();
  const userId = session?.user?.id ?? "";

  const [campaignCount, pendingOfferCount] = await Promise.all([
    prisma.campaign.count({ where: { userId } }),
    getPendingOfferCount(userId),
  ]);

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-4 p-4">
      <PageHeader
        eyebrow="Campagnes"
        title="Vue d'ensemble"
        subtitle="Campagnes actives et nouvelles offres en attente."
      />
      <HarvesterTabs reviewQueueCount={pendingOfferCount} />
      <HarvesterOverview campaignCount={campaignCount} pendingOfferCount={pendingOfferCount} />
    </div>
  );
}
