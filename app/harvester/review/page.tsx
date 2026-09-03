import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getPendingOfferCount } from "@/lib/harvester/pending-offer-count";
import { PageHeader } from "@/components/page-header";
import { HarvesterTabs } from "@/components/harvester/harvester-tabs";
import { ReviewQueueManager } from "@/components/harvester/review-queue-manager";
import { ConnectorHealthPanel } from "@/components/harvester/connector-health-panel";

const PAGE_SIZE = 25;

export default async function HarvesterReviewPage(props: PageProps<"/harvester/review">) {
  const searchParams = await props.searchParams;
  const cursor = typeof searchParams.cursor === "string" ? searchParams.cursor : undefined;
  // JOB-155 : les pastilles de campagne filtraient jusqu'ici uniquement la page déjà chargée
  // côté client (PAGE_SIZE offres les plus récentes) — une campagne dont les offres ne
  // figuraient pas sur cette page précise semblait n'avoir aucune offre, alors qu'elle en avait
  // ailleurs dans la file. Le filtre doit porter sur la requête Prisma elle-même, en amont de la
  // pagination, comme le fait déjà `cursor`.
  const campaignsParam = typeof searchParams.campaigns === "string" ? searchParams.campaigns : undefined;
  const activeCampaignIds = campaignsParam ? campaignsParam.split(",").filter(Boolean) : [];

  const session = await auth();
  const userId = session?.user?.id ?? "";

  const [offersPage, connectorRuns, pendingOfferCount, campaigns] = await Promise.all([
    prisma.harvestedOffer.findMany({
      where: {
        userId,
        importedJobId: null,
        ignoredAt: null,
        ...(activeCampaignIds.length > 0 ? { campaignId: { in: activeCampaignIds } } : {}),
      },
      orderBy: { firstSeenAt: "desc" },
      take: PAGE_SIZE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    }),
    prisma.connectorRun.findMany({
      where: { campaign: { userId } },
      distinct: ["connectorId"],
      orderBy: { startedAt: "desc" },
    }),
    getPendingOfferCount(userId),
    prisma.campaign.findMany({
      where: { userId },
      select: { id: true, name: true, slug: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const hasNextPage = offersPage.length > PAGE_SIZE;
  const offers = hasNextPage ? offersPage.slice(0, PAGE_SIZE) : offersPage;
  const nextCursor = hasNextPage ? offers[offers.length - 1]!.id : null;

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-4 p-4">
      <PageHeader
        eyebrow="Campagnes"
        title="Nouvelles offres"
        subtitle="Offres trouvées par vos campagnes — ajoutez-les à votre suivi ou passez."
      />
      <HarvesterTabs reviewQueueCount={pendingOfferCount} />
      <ConnectorHealthPanel runs={connectorRuns} />
      {/* key={cursor + campagnes actives} force un remontage complet à chaque page ou changement
          de filtre de campagne — sans ça, useState(initialOffers) ne se resynchronise jamais sur
          un simple re-render (JOB-155 : sélectionner une pastille de campagne changeait bien
          l'URL et le payload RSC renvoyé par le serveur, mais l'ancien état local `offers`
          restait affiché tel quel). Si la nouvelle page est la dernière (nextCursor devient
          null), le bouton "Page suivante" et son NextPagePendingBridge disparaissent aussi du
          JSX sans jamais avoir repassé isPaginating à false, laissant le tableau bloqué en état
          de chargement indéfiniment — d'où le remontage complet plutôt qu'un simple effet. */}
      <ReviewQueueManager
        key={`${cursor ?? "first-page"}::${activeCampaignIds.join(",") || "all-campaigns"}`}
        initialOffers={offers}
        nextCursor={nextCursor}
        campaigns={campaigns}
        activeCampaignIds={activeCampaignIds}
      />
    </div>
  );
}
