import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  CAMPAIGN_CONTRACT_TYPE_LABELS,
  type CampaignContractType,
} from "@/lib/harvester/campaign-validation";
import type { SearchableOffer } from "@/components/search/offer-search";

const REMOTE_POLICY_LABELS: Partial<Record<string, string>> = {
  ONSITE: "Sur site",
  HYBRID: "Hybride",
  REMOTE: "Télétravail",
};

export type SearchableOffersResult =
  | { ok: true; offers: SearchableOffer[] }
  | { ok: false; error: string };

/**
 * Charge et met en forme les offres collectées pour la recherche (page
 * `/recherche`) — extrait de la page (Server Component) pour être testable
 * unitairement et pour isoler la gestion d'erreur (JOB-116) : un échec de
 * lecture base de données ne doit pas faire planter tout le rendu de la
 * page, seulement remonter un message clair.
 */
export async function getSearchableOffers(
  userId: string,
  take: number
): Promise<SearchableOffersResult> {
  // JOB-138 : le Harvester reste un modèle par utilisateur (JOB-136) — sans
  // identifiant, aucune offre ne peut exister pour cet appelant. Court-circuiter
  // ici évite une requête base de données qui ne renverrait de toute façon
  // jamais rien, plutôt que de laisser `where: { userId: "" }` filer en base.
  if (!userId) {
    return { ok: true, offers: [] };
  }

  try {
    const harvestedOffers = await prisma.harvestedOffer.findMany({
      where: { userId, ignoredAt: null },
      orderBy: { firstSeenAt: "desc" },
      take,
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

    return { ok: true, offers };
  } catch (error) {
    logger.error("search.offers.load_failed", {
      error: error instanceof Error ? error.message : String(error),
      userId,
    });
    Sentry.captureException(error, { tags: { action: "getSearchableOffers" } });
    return {
      ok: false,
      error: "Impossible de charger vos offres pour le moment. Réessayez dans quelques instants.",
    };
  }
}
