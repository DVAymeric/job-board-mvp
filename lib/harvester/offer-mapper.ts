import type { HarvestedOffer, OfferContractType, OfferLifecycle, OfferRemotePolicy, Prisma } from "@prisma/client";
import { exactDedupKeyFromSource } from "@/lib/harvester/dedup-key";
import type { ContractType, Lifecycle, NormalizedOffer, RemotePolicy, SourceRef } from "@/lib/harvester/normalized-offer";

// Traduction bidirectionnelle enum Prisma (majuscules) <-> NormalizedOffer (minuscules,
// format connecteur d'origine — voir lib/harvester/normalized-offer.ts).
const CONTRACT_TYPE_TO_PRISMA: Record<ContractType, OfferContractType> = {
  apprentissage: "APPRENTISSAGE",
  professionnalisation: "PROFESSIONNALISATION",
  stage: "STAGE",
  cdi: "CDI",
  cdd: "CDD",
  autre: "AUTRE",
};
const CONTRACT_TYPE_FROM_PRISMA: Record<OfferContractType, ContractType> = {
  APPRENTISSAGE: "apprentissage",
  PROFESSIONNALISATION: "professionnalisation",
  STAGE: "stage",
  CDI: "cdi",
  CDD: "cdd",
  AUTRE: "autre",
};

const REMOTE_POLICY_TO_PRISMA: Record<RemotePolicy, OfferRemotePolicy> = {
  onsite: "ONSITE",
  hybrid: "HYBRID",
  remote: "REMOTE",
  unknown: "UNKNOWN",
};
const REMOTE_POLICY_FROM_PRISMA: Record<OfferRemotePolicy, RemotePolicy> = {
  ONSITE: "onsite",
  HYBRID: "hybrid",
  REMOTE: "remote",
  UNKNOWN: "unknown",
};

const LIFECYCLE_TO_PRISMA: Record<Lifecycle, OfferLifecycle> = {
  active: "ACTIVE",
  expired: "EXPIRED",
  dead_link: "DEAD_LINK",
};
const LIFECYCLE_FROM_PRISMA: Record<OfferLifecycle, Lifecycle> = {
  ACTIVE: "active",
  EXPIRED: "expired",
  DEAD_LINK: "dead_link",
};

/**
 * `HarvestedOffer.id` (Prisma) est un uuid généré à l'insertion, distinct de
 * `NormalizedOffer.id` (id déterministe dérivé de source+sourceOfferId par
 * chaque connecteur — voir exactDedupKeyFromSource). On ne stocke pas ce
 * second id en base : il est recalculé ici, à l'identique, plutôt que
 * persisté en double.
 */
export function harvestedOfferToNormalizedOffer(row: HarvestedOffer): NormalizedOffer {
  return {
    id: exactDedupKeyFromSource(row.source, row.sourceOfferId),
    source: row.source,
    sourceOfferId: row.sourceOfferId,
    originSource: row.originSource ?? undefined,
    canonicalUrl: row.canonicalUrl,
    applyUrl: row.applyUrl ?? undefined,
    title: row.title,
    company: {
      name: row.companyName,
      normalizedName: row.companyNormalizedName,
      siret: row.companySiret ?? undefined,
      website: row.companyWebsite ?? undefined,
    },
    location: {
      label: row.locationLabel,
      city: row.city,
      postalCode: row.postalCode ?? undefined,
      department: row.department ?? undefined,
      lat: row.lat ?? undefined,
      lng: row.lng ?? undefined,
    },
    contractType: CONTRACT_TYPE_FROM_PRISMA[row.contractType],
    durationMonths: row.durationMonths ?? undefined,
    startDate: row.startDate ?? undefined,
    romeCodes: row.romeCodes,
    descriptionText: row.descriptionText,
    descriptionHtml: row.descriptionHtml ?? undefined,
    salary: (row.salary as NormalizedOffer["salary"] | null) ?? undefined,
    remotePolicy: row.remotePolicy ? REMOTE_POLICY_FROM_PRISMA[row.remotePolicy] : undefined,
    postedAt: row.postedAt ?? undefined,
    expiresAt: row.expiresAt ?? undefined,
    firstSeenAt: row.firstSeenAt.toISOString(),
    lastSeenAt: row.lastSeenAt.toISOString(),
    lifecycle: LIFECYCLE_FROM_PRISMA[row.lifecycle],
    dedupKey: row.dedupKey,
    sourceRefs: row.sourceRefs as SourceRef[],
    rawPayload: row.rawPayload,
  };
}

export function normalizedOfferToHarvestedOfferData(
  offer: NormalizedOffer,
  userId: string,
  campaignId: string,
): Prisma.HarvestedOfferUncheckedCreateInput {
  return {
    userId,
    campaignId,
    source: offer.source,
    sourceOfferId: offer.sourceOfferId,
    originSource: offer.originSource,
    canonicalUrl: offer.canonicalUrl,
    applyUrl: offer.applyUrl,
    title: offer.title,
    companyName: offer.company.name,
    companyNormalizedName: offer.company.normalizedName,
    companySiret: offer.company.siret,
    companyWebsite: offer.company.website,
    locationLabel: offer.location.label,
    city: offer.location.city,
    postalCode: offer.location.postalCode,
    department: offer.location.department,
    lat: offer.location.lat,
    lng: offer.location.lng,
    contractType: CONTRACT_TYPE_TO_PRISMA[offer.contractType],
    durationMonths: offer.durationMonths,
    startDate: offer.startDate,
    romeCodes: offer.romeCodes,
    descriptionText: offer.descriptionText,
    descriptionHtml: offer.descriptionHtml,
    salary: offer.salary ?? undefined,
    remotePolicy: offer.remotePolicy ? REMOTE_POLICY_TO_PRISMA[offer.remotePolicy] : null,
    postedAt: offer.postedAt,
    expiresAt: offer.expiresAt,
    firstSeenAt: new Date(offer.firstSeenAt),
    lastSeenAt: new Date(offer.lastSeenAt),
    lifecycle: LIFECYCLE_TO_PRISMA[offer.lifecycle],
    dedupKey: offer.dedupKey,
    sourceRefs: offer.sourceRefs,
    rawPayload: offer.rawPayload as Prisma.InputJsonValue,
  };
}
