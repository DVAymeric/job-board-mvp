import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { CampaignsManager } from "@/components/harvester/campaigns-manager";

export default async function HarvesterCampaignsPage() {
  const session = await auth();
  const userId = session?.user?.id ?? "";

  const campaigns = await prisma.campaign.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-4 p-4">
      <PageHeader
        eyebrow="Harvester"
        title="Campagnes"
        subtitle="Mots-clés, zones géographiques et types de contrat visés par chaque collecte."
      />
      <CampaignsManager initialCampaigns={campaigns} />
    </div>
  );
}
