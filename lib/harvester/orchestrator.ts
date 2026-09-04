import { z } from "zod";
import type { Campaign, OfferContractType, PrismaClient } from "@prisma/client";
import { isFuzzyDuplicate, mergeOffers } from "@/lib/harvester/merge";
import { harvestedOfferToNormalizedOffer, normalizedOfferToHarvestedOfferData } from "@/lib/harvester/offer-mapper";
import { createRateLimitedFetch } from "@/lib/harvester/rate-limited-fetch";
import { LocationConfigSchema, type LocationConfig } from "@/lib/harvester/campaign-config";
import { HarvestTargetsSchema, type HarvestQuery } from "@/lib/harvester/harvest-query";
import type { ContractType, NormalizedOffer } from "@/lib/harvester/normalized-offer";
import type { Connector } from "@/lib/harvester/connector";
import { offerMatchesQuery, acceptableLocationsFromLocations } from "@/lib/harvester/query-filter";
import { logger } from "@/lib/logger";

// Enum Prisma OfferContractType (majuscules) -> ContractType (minuscules, format
// HarvestQuery/connecteurs) — voir aussi lib/harvester/offer-mapper.ts pour la table complète
// dans l'autre sens. Typé sur l'enum Prisma (pas `string`) pour que le compilateur signale
// toute valeur manquante à l'extension de l'enum (cdi/cdd, JOB-78-bis, ont été ajoutés ici
// à la main faute de ce typage strict — la table complète dans offer-mapper.ts l'a).
const CONTRACT_TYPE_FROM_PRISMA: Record<OfferContractType, ContractType> = {
  APPRENTISSAGE: "apprentissage",
  PROFESSIONNALISATION: "professionnalisation",
  STAGE: "stage",
  CDI: "cdi",
  CDD: "cdd",
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

// JOB-159 : trouvé en audit QA — une campagne large (mot-clé générique, tous types de contrat,
// grand rayon) pouvait déverser des centaines d'offres non triées en un seul run, sans plafond
// ni tri de pertinence, rendant la file de revue inexploitable. Plafond par connecteur et par
// run (pas par campagne globale) : une campagne à plusieurs connecteurs reste donc bornée
// connecteur par connecteur, plutôt que par un total arbitraire réparti entre eux.
const MAX_NORMALIZED_OFFERS_PER_RUN = 200;

export interface RunSummary {
  runId: string;
  rawCount: number;
  normalizedCount: number;
  // Sous-ensemble de normalizedCount réellement visible dans la file de revue après cet
  // upsert (importedJobId:null && ignoredAt:null) — une offre déjà ignorée ou déjà importée
  // que le run retrouve est comptée dans normalizedCount mais pas ici (JOB-165).
  pendingCount: number;
  rejectedCount: number;
  filteredCount: number;
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
// Retourne `true` si l'offre est visible dans la file de revue après l'upsert
// (importedJobId:null && ignoredAt:null) — utilisé pour RunSummary.pendingCount (JOB-165).
async function upsertOffer(
  prisma: PrismaClient,
  userId: string,
  campaignId: string,
  normalized: NormalizedOffer,
): Promise<boolean> {
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
    return exactMatchRow.importedJobId === null && exactMatchRow.ignoredAt === null;
  }

  const candidates = await prisma.harvestedOffer.findMany({ where: { userId } });
  const fuzzyMatchRow = candidates.find((row) => isFuzzyDuplicate(harvestedOfferToNormalizedOffer(row), normalized));
  if (fuzzyMatchRow) {
    const merged = mergeOffers(harvestedOfferToNormalizedOffer(fuzzyMatchRow), normalized);
    await prisma.harvestedOffer.update({
      where: { id: fuzzyMatchRow.id },
      data: normalizedOfferToHarvestedOfferData(merged, userId, campaignId),
    });
    return fuzzyMatchRow.importedJobId === null && fuzzyMatchRow.ignoredAt === null;
  }

  await prisma.harvestedOffer.create({ data: normalizedOfferToHarvestedOfferData(normalized, userId, campaignId) });
  return true;
}

export async function runCampaign(
  campaign: Campaign,
  connector: Connector,
  prisma: PrismaClient,
  env: Record<string, string | undefined>,
): Promise<RunSummary> {
  const guardedFetch = sharedGuardedFetch;
  const { locations, targets } = parseCampaignConfig(campaign);
  // Dérivées de TOUTES les localisations de la campagne, pas de la seule localisation de
  // l'itération de boucle courante — un connecteur locationScoped:false n'est fetché qu'une
  // fois avec la première localisation, ses offres doivent quand même pouvoir matcher
  // n'importe laquelle des localisations de la campagne (JOB-75/77).
  const acceptableLocations = acceptableLocationsFromLocations(locations);
  const startedAt = new Date();
  let rawCount = 0;
  let normalizedCount = 0;
  let pendingCount = 0;
  let rejectedCount = 0;
  let filteredCount = 0;
  let unresolvedLocationCount = 0;
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
        if (normalizedCount >= MAX_NORMALIZED_OFFERS_PER_RUN) break;
        rawCount += 1;
        try {
          const normalized = connector.normalize(raw);
          // JOB-73 : filet de sécurité final, appliqué après normalize() pour tous les
          // connecteurs (tier0 et tier1) — une offre hors contrat/mots-clés/localisation de la
          // requête n'est jamais persistée, même si le connecteur d'origine n'a pas de
          // pré-filtre. Ne remplace pas les pré-filtres existants côté connecteurs.
          // JOB-76 : comptée à part (filteredCount) de rejectedCount, réservé aux échecs de
          // normalize() ; le détail par motif n'est pas loggé offre par offre (trop verbeux à
          // fort volume) — seul le total "localisation non vérifiable" est loggé une fois, en
          // fin de run, agrégé sur toute la campagne pour ce connecteur.
          const filterResult = offerMatchesQuery(normalized, query, acceptableLocations);
          if (!filterResult.matches) {
            filteredCount += 1;
            if (filterResult.reason === "location_unresolved") {
              unresolvedLocationCount += 1;
            }
            continue;
          }
          normalizedCount += 1;
          const isPending = await upsertOffer(prisma, campaign.userId, campaign.id, normalized);
          if (isPending) pendingCount += 1;
        } catch {
          rejectedCount += 1;
        }
      }
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
    }
  }

  if (unresolvedLocationCount > 0) {
    logger.warn("harvester.orchestrator.offers_rejected_location_unresolved", {
      connectorId: connector.id,
      campaignId: campaign.id,
      count: unresolvedLocationCount,
    });
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
      filteredCount,
      httpStatusesSeen: [],
      ok,
      errorMessage,
    },
  });

  return { runId: run.id, rawCount, normalizedCount, pendingCount, rejectedCount, filteredCount, ok, errorMessage };
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
