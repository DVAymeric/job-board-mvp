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
      // Doit rester aligné avec listCampaigns() (app/actions/campaigns.ts) — sans le tri par
      // `order`, chaque rechargement de la page (ex. changement d'onglet) réaffichait les
      // campagnes dans leur ordre de création, annulant silencieusement tout glisser-déposer
      // (JOB-153, suite).
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    }),
    getPendingOfferCount(userId),
  ]);

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-4 p-4">
      <PageHeader
        eyebrow="Campagnes"
        title="Campagnes"
        subtitle="Mots-clés, zones géographiques et types de contrat visés par chaque campagne."
      />
      <HarvesterTabs reviewQueueCount={pendingOfferCount} />
      <CampaignsManager initialCampaigns={campaigns} />
    </div>
  );
}
