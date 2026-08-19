"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { InMemorySlidingWindowRateLimiter } from "@/lib/rate-limit";
import { STATUS } from "@/lib/constants";
import { runCampaignAcrossConnectors, type RunSummary } from "@/lib/harvester/orchestrator";
import { ALL_CONNECTORS } from "@/lib/harvester/connectors";
import { harvestEnv } from "@/lib/harvester/harvest-env";
import {
  triggerCampaignCollectionSchema,
  importHarvestedOfferSchema,
  ignoreHarvestedOfferSchema,
} from "@/lib/harvester/harvest-validation";
import {
  actionError,
  campaignOwnerWhere,
  type ActionResult,
  firstIssueMessage,
  logActionError,
  rateLimitError,
} from "./_shared";

// Un déclenchement de collecte frappe plusieurs API tierces d'un coup (jusqu'à 4 connecteurs ×
// N localisations) — plafond bien plus bas que les Server Actions habituelles (30/60s,
// jobs-create.ts) pour empêcher des déclenchements en boucle d'épuiser les quotas tiers ou de
// se faire bannir (JOB-46, item différé de la revue de sécurité jusqu'à l'existence de cette
// action).
const TRIGGER_COLLECTION_RATE_LIMIT = new InMemorySlidingWindowRateLimiter(5, 60_000);

/**
 * Déclenche une collecte manuelle pour une campagne : exécute tous les
 * connecteurs qui la supportent (runCampaignAcrossConnectors, JOB-45) et
 * journalise un ConnectorRun par connecteur exécuté.
 *
 * @errors `UNAUTHENTICATED`, `VALIDATION_ERROR`, `RATE_LIMITED`, `NOT_FOUND`
 * (campagne introuvable pour cet utilisateur), `INTERNAL_ERROR`.
 */
export async function triggerCampaignCollection(
  input: unknown
): Promise<ActionResult<{ runs: RunSummary[] }>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const limit = TRIGGER_COLLECTION_RATE_LIMIT.check(auth.user.id);
  if (!limit.allowed) {
    return actionError("RATE_LIMITED", rateLimitError(limit.retryAfterSeconds));
  }

  const parsed = triggerCampaignCollectionSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", firstIssueMessage(parsed.error, "Impossible de déclencher la collecte"));
  }
  try {
    const campaign = await prisma.campaign.findUnique({
      where: campaignOwnerWhere(parsed.data.campaignId, auth.user.id),
    });
    if (!campaign) {
      return actionError("NOT_FOUND", "Campagne introuvable");
    }

    const runs = await runCampaignAcrossConnectors(campaign, ALL_CONNECTORS, prisma, harvestEnv());
    revalidatePath("/harvester/review");
    return { ok: true, data: { runs } };
  } catch (error) {
    logActionError("triggerCampaignCollection", error, { userId: auth.user.id });
    return actionError("INTERNAL_ERROR", "Impossible de déclencher la collecte");
  }
}

/**
 * Importe une offre collectée vers une candidature Jobboard (Job) —
 * idempotent : ré-importer une offre déjà importée renvoie l'id du Job
 * existant sans en recréer un second (JOB-47).
 *
 * @errors `UNAUTHENTICATED`, `VALIDATION_ERROR`, `NOT_FOUND` (offre
 * introuvable pour cet utilisateur), `INTERNAL_ERROR`.
 */
export async function importHarvestedOffer(
  input: unknown
): Promise<ActionResult<{ jobId: string }>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const parsed = importHarvestedOfferSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", firstIssueMessage(parsed.error, "Impossible d'importer cette offre"));
  }
  try {
    const offer = await prisma.harvestedOffer.findFirst({
      where: { id: parsed.data.offerId, userId: auth.user.id },
    });
    if (!offer) {
      return actionError("NOT_FOUND", "Offre introuvable");
    }
    if (offer.importedJobId) {
      return { ok: true, data: { jobId: offer.importedJobId } };
    }

    let jobId: string;
    try {
      const job = await prisma.job.create({
        data: {
          userId: auth.user.id,
          url: offer.applyUrl ?? offer.canonicalUrl,
          title: offer.title,
          companyName: offer.companyName,
          descriptionText: offer.descriptionText,
          status: STATUS.TO_APPLY,
          enrichmentStatus: "DONE",
          statusHistory: { create: { status: STATUS.TO_APPLY } },
        },
      });
      jobId = job.id;
    } catch (createError) {
      // Deux imports concurrents de la même offre (double-clic) : le second arrive ici après
      // que le premier ait déjà créé le Job (contrainte unique userId+url) mais avant que
      // importedJobId ne soit posé — on relit l'offre plutôt que d'échouer, pour rester
      // idempotent même sous concurrence (JOB-47).
      if (createError instanceof Prisma.PrismaClientKnownRequestError && createError.code === "P2002") {
        const refreshed = await prisma.harvestedOffer.findUnique({ where: { id: offer.id } });
        if (refreshed?.importedJobId) {
          return { ok: true, data: { jobId: refreshed.importedJobId } };
        }
      }
      throw createError;
    }
    await prisma.harvestedOffer.update({ where: { id: offer.id }, data: { importedJobId: jobId } });

    revalidatePath("/board");
    revalidatePath("/harvester/review");
    return { ok: true, data: { jobId } };
  } catch (error) {
    logActionError("importHarvestedOffer", error, { userId: auth.user.id });
    return actionError("INTERNAL_ERROR", "Impossible d'importer cette offre");
  }
}

/**
 * Retire une offre collectée de la file de revue sans l'importer —
 * idempotent (ré-ignorer une offre déjà ignorée ne fait rien de plus).
 *
 * @errors `UNAUTHENTICATED`, `VALIDATION_ERROR`, `NOT_FOUND` (offre
 * introuvable pour cet utilisateur), `INTERNAL_ERROR`.
 */
export async function ignoreHarvestedOffer(input: unknown): Promise<ActionResult<null>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const parsed = ignoreHarvestedOfferSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", firstIssueMessage(parsed.error, "Impossible d'ignorer cette offre"));
  }
  try {
    const offer = await prisma.harvestedOffer.findFirst({
      where: { id: parsed.data.offerId, userId: auth.user.id },
    });
    if (!offer) {
      return actionError("NOT_FOUND", "Offre introuvable");
    }
    if (!offer.ignoredAt) {
      await prisma.harvestedOffer.update({
        where: { id: offer.id },
        data: { ignoredAt: new Date() },
      });
    }
    revalidatePath("/harvester/review");
    return { ok: true, data: null };
  } catch (error) {
    logActionError("ignoreHarvestedOffer", error, { userId: auth.user.id });
    return actionError("INTERNAL_ERROR", "Impossible d'ignorer cette offre");
  }
}
