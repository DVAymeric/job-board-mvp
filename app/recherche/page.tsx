import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { BOARD_JOBS_SAFETY_LIMIT } from "@/lib/constants";
import { PageHeader } from "@/components/page-header";
import { OfferSearch, type SearchableOffer } from "@/components/search/offer-search";
import {
  CAMPAIGN_CONTRACT_TYPE_LABELS,
  type CampaignContractType,
} from "@/lib/harvester/campaign-validation";

const REMOTE_POLICY_LABELS: Partial<Record<string, string>> = {
  ONSITE: "Sur site",
  HYBRID: "Hybride",
  REMOTE: "Télétravail",
};

export default async function RecherchePage() {
  const session = await auth();
  const userId = session?.user?.id ?? "";

  const harvestedOffers = await prisma.harvestedOffer.findMany({
    where: { userId, ignoredAt: null },
    orderBy: { firstSeenAt: "desc" },
    take: BOARD_JOBS_SAFETY_LIMIT,
  });

  const offers: SearchableOffer[] = harvestedOffers.map((offer) => {
    const remoteTag = offer.remotePolicy ? REMOTE_POLICY_LABELS[offer.remotePolicy] : undefined;
    const contractLabel =
      CAMPAIGN_CONTRACT_TYPE_LABELS[offer.contractType as CampaignContractType] ??
      offer.contractType;
    const publishedAt = offer.postedAt ? new Date(offer.postedAt) : offer.firstSeenAt;

    return {
      result: {
        id: offer.id,
        title: offer.title,
        companyName: offer.companyName,
        companyLogoUrl: null,
        location: offer.locationLabel,
        publishedAt: Number.isNaN(publishedAt.getTime()) ? offer.firstSeenAt : publishedAt,
        contractType: contractLabel,
        tags: remoteTag ? [remoteTag] : [],
        beginnerFriendly: false,
        applyUrl: offer.applyUrl ?? offer.canonicalUrl,
      },
      keywordHaystack: `${offer.title} ${offer.companyName}`.toLowerCase(),
      locationHaystack: offer.locationLabel.toLowerCase(),
      rawContractType: offer.contractType,
    };
  });

  return (
    <div className="mx-auto w-full max-w-[1120px] space-y-4 p-4">
      <PageHeader
        eyebrow="Recherche"
        title="Recherche d'offres"
        subtitle="Parcourez les offres déjà collectées pour vous par le Harvester."
      />
      <OfferSearch offers={offers} />
    </div>
  );
}
