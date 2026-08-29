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

  const session = await auth();
  const userId = session?.user?.id ?? "";

  const [offersPage, connectorRuns, pendingOfferCount] = await Promise.all([
    prisma.harvestedOffer.findMany({
      where: { userId, importedJobId: null, ignoredAt: null },
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
  ]);

  const hasNextPage = offersPage.length > PAGE_SIZE;
  const offers = hasNextPage ? offersPage.slice(0, PAGE_SIZE) : offersPage;
  const nextCursor = hasNextPage ? offers[offers.length - 1]!.id : null;

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-4 p-4">
      <PageHeader
        eyebrow="Harvester"
        title="File de revue"
        subtitle="Offres collectées non encore traitées — importez-les vers le board ou ignorez-les."
      />
      <HarvesterTabs reviewQueueCount={pendingOfferCount} />
      <ConnectorHealthPanel runs={connectorRuns} />
      <ReviewQueueManager initialOffers={offers} nextCursor={nextCursor} />
    </div>
  );
}
