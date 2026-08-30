import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getPendingOfferCount } from "@/lib/harvester/pending-offer-count";
import { getPendingDiscoveredTargetCount } from "@/lib/harvester/pending-discovered-target-count";
import { PageHeader } from "@/components/page-header";
import { HarvesterTabs } from "@/components/harvester/harvester-tabs";
import { DiscoveredTargetsManager } from "@/components/harvester/discovered-targets-manager";

export default async function HarvesterDiscoveryPage() {
  const session = await auth();
  const userId = session?.user?.id ?? "";

  const [targets, pendingOfferCount, discoveredTargetCount] = await Promise.all([
    prisma.discoveredTarget.findMany({
      where: { userId, status: "PENDING" },
      orderBy: { discoveredAt: "desc" },
    }),
    getPendingOfferCount(userId),
    getPendingDiscoveredTargetCount(userId),
  ]);

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-4 p-4">
      <PageHeader
        eyebrow="Harvester"
        title="Cibles découvertes"
        subtitle="Entreprises repérées dans vos offres et trouvées sur Workday, SmartRecruiters, Talentsoft ou DigitalRecruiters — approuvez pour les ajouter à vos campagnes."
      />
      <HarvesterTabs reviewQueueCount={pendingOfferCount} discoveredTargetCount={discoveredTargetCount} />
      <DiscoveredTargetsManager initialTargets={targets} />
    </div>
  );
}
