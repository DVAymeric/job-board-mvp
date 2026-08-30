import { z } from "zod";
import type { Campaign, PrismaClient } from "@prisma/client";
import { isFuzzyDuplicate, mergeOffers } from "@/lib/harvester/merge";
import { harvestedOfferToNormalizedOffer, normalizedOfferToHarvestedOfferData } from "@/lib/harvester/offer-mapper";
import { createRateLimitedFetch } from "@/lib/harvester/rate-limited-fetch";
import { LocationConfigSchema, type LocationConfig } from "@/lib/harvester/campaign-config";
import { HarvestTargetsSchema, type HarvestQuery } from "@/lib/harvester/harvest-query";
import type { ContractType, NormalizedOffer } from "@/lib/harvester/normalized-offer";
import type { Connector } from "@/lib/harvester/connector";
import { offerMatchesQuery } from "@/lib/harvester/query-filter";
import { logger } from "@/lib/logger";

// Enum Prisma OfferContractType (majuscules) -> ContractType (minuscules, format
// HarvestQuery/connecteurs) — voir aussi lib/harvester/offer-mapper.ts pour la table complète
// dans l'autre sens.
const CONTRACT_TYPE_FROM_PRISMA: Record<string, ContractType> = {
  APPRENTISSAGE: "apprentissage",
  PROFESSIONNALISATION: "professionnalisation",
  STAGE: "stage",
  AUTRE: "autre",
};

const CampaignConfigJsonSchema = z.object({
  locations: z.array(LocationConfigSchema),
  targets: HarvestTargetsSchema.optional(),
});

function parseCampaignConfig(campaign: Campaign): { locations: LocationConfig[]; targets?: z.infer<typeof HarvestTargetsSchema> } {
  return CampaignConfigJsonSchema.parse(campaign.config);
}

function buildHarvestQueryForLocation(
  campaign: Campaign,
  location: LocationConfig,
  targets: z.infer<typeof HarvestTargetsSchema> | undefined,
): HarvestQuery {
  return {
    campaignId: campaign.id,
    keywords: campaign.keywords,
    romeCodes: campaign.romeCodes,
    location,
    contractTypes: campaign.contractTypes.map((type) => CONTRACT_TYPE_FROM_PRISMA[type]!),
    targets,
  };
}

// JOB-12 (job-harvester) : instance partagée au niveau module — un seul jeu de seaux à jetons
// (par hostname) pour toute la durée de vie du process, afin que le rate limiting reste
// effectif même quand plusieurs campagnes déclenchent runCampaign() indépendamment.
const sharedGuardedFetch = createRateLimitedFetch(fetch);

export interface RunSummary {
  runId: string;
  rawCount: number;
  normalizedCount: number;
  rejectedCount: number;
  ok: boolean;
  errorMessage?: string;
}

/**
 * Upsert avec dédoublonnage exact (dedupKey ou source+sourceOfferId) puis flou (comparaison
 * en mémoire, comme l'original — voir isFuzzyDuplicate), scopé à `userId` (le dédoublonnage ne
 * traverse jamais les comptes). `mergeOffers` retourne un NormalizedOffer dont `id` est
 * recalculé (exactDedupKeyFromSource), pas l'uuid Prisma de la ligne existante — on garde donc
 * cet uuid à part pour cibler l'update.
 */
async function upsertOffer(
  prisma: PrismaClient,
  userId: string,
  campaignId: string,
  normalized: NormalizedOffer,
): Promise<void> {
  const exactMatchRow = await prisma.harvestedOffer.findFirst({
    where: {
      userId,
      OR: [{ dedupKey: normalized.dedupKey }, { source: normalized.source, sourceOfferId: normalized.sourceOfferId }],
    },
  });
  if (exactMatchRow) {
    const merged = mergeOffers(harvestedOfferToNormalizedOffer(exactMatchRow), normalized);
    await prisma.harvestedOffer.update({
      where: { id: exactMatchRow.id },
      data: normalizedOfferToHarvestedOfferData(merged, userId, campaignId),
    });
    return;
  }

  const candidates = await prisma.harvestedOffer.findMany({ where: { userId } });
  const fuzzyMatchRow = candidates.find((row) => isFuzzyDuplicate(harvestedOfferToNormalizedOffer(row), normalized));
  if (fuzzyMatchRow) {
    const merged = mergeOffers(harvestedOfferToNormalizedOffer(fuzzyMatchRow), normalized);
    await prisma.harvestedOffer.update({
      where: { id: fuzzyMatchRow.id },
      data: normalizedOfferToHarvestedOfferData(merged, userId, campaignId),
    });
    return;
  }

  await prisma.harvestedOffer.create({ data: normalizedOfferToHarvestedOfferData(normalized, userId, campaignId) });
}

export async function runCampaign(
  campaign: Campaign,
  connector: Connector,
  prisma: PrismaClient,
  env: Record<string, string | undefined>,
): Promise<RunSummary> {
  const guardedFetch = sharedGuardedFetch;
  const { locations, targets } = parseCampaignConfig(campaign);
  const startedAt = new Date();
  let rawCount = 0;
  let normalizedCount = 0;
  let rejectedCount = 0;
  let errorMessage: string | undefined;

  let hasFetchedOnce = false;
  for (const location of locations) {
    const query = buildHarvestQueryForLocation(campaign, location, targets);
    if (!connector.supports(query)) continue;
    if (connector.locationScoped === false) {
      if (hasFetchedOnce) continue;
      hasFetchedOnce = true;
    }

    try {
      for await (const raw of connector.fetch(query, { fetchImpl: guardedFetch, env })) {
        rawCount += 1;
        try {
          const normalized = connector.normalize(raw);
          // JOB-73 : filet de sécurité final, appliqué après normalize() pour tous les
          // connecteurs (tier0 et tier1) — une offre hors contrat/mots-clés/localisation de la
          // requête n'est jamais persistée, même si le connecteur d'origine n'a pas de
          // pré-filtre. Ne remplace pas les pré-filtres existants côté connecteurs.
          if (!offerMatchesQuery(normalized, query)) {
            rejectedCount += 1;
            logger.warn("harvester.orchestrator.offer_rejected_by_query_filter", {
              connectorId: connector.id,
              source: normalized.source,
              sourceOfferId: normalized.sourceOfferId,
            });
            continue;
          }
          normalizedCount += 1;
          await upsertOffer(prisma, campaign.userId, campaign.id, normalized);
        } catch {
          rejectedCount += 1;
        }
      }
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
    }
  }

  const ok = errorMessage === undefined;
  const run = await prisma.connectorRun.create({
    data: {
      campaignId: campaign.id,
      connectorId: connector.id,
      startedAt,
      finishedAt: new Date(),
      rawCount,
      normalizedCount,
      rejectedCount,
      httpStatusesSeen: [],
      ok,
      errorMessage,
    },
  });

  return { runId: run.id, rawCount, normalizedCount, rejectedCount, ok, errorMessage };
}

export async function runCampaignAcrossConnectors(
  campaign: Campaign,
  connectors: Connector[],
  prisma: PrismaClient,
  env: Record<string, string | undefined>,
): Promise<RunSummary[]> {
  const { locations, targets } = parseCampaignConfig(campaign);
  const supportedConnectors = connectors.filter((connector) =>
    locations.some((location) => connector.supports(buildHarvestQueryForLocation(campaign, location, targets))),
  );

  const summaries: RunSummary[] = [];
  for (const connector of supportedConnectors) {
    summaries.push(await runCampaign(campaign, connector, prisma, env));
  }
  return summaries;
}
