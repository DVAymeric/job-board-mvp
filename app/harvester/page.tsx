import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { HarvesterOverview } from "@/components/harvester/harvester-overview";

export default async function HarvesterPage() {
  const session = await auth();
  const userId = session?.user?.id ?? "";

  const [campaignCount, pendingOfferCount] = await Promise.all([
    prisma.campaign.count({ where: { userId } }),
    prisma.harvestedOffer.count({ where: { userId, importedJobId: null } }),
  ]);

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-4 p-4">
      <PageHeader
        eyebrow="Collecte automatisée"
        title="Harvester"
        subtitle="Campagnes de recherche et offres collectées en attente de revue."
      />
      <HarvesterOverview campaignCount={campaignCount} pendingOfferCount={pendingOfferCount} />
    </div>
  );
}
