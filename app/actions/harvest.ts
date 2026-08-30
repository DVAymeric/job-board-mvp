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
import { healthCheckWithTimeout, type ConnectorHealth } from "@/lib/harvester/timed-health-check";
import { discoverTargets } from "@/lib/harvester/discovery/discover-targets";
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

// Chaque appel frappe l'API tierce de chaque connecteur enregistré (ALL_CONNECTORS) — même logique de
// protection anti-abus que TRIGGER_COLLECTION_RATE_LIMIT, plafond un peu plus haut car un
// simple ping healthCheck() est bien moins coûteux qu'une collecte complète (JOB-59).
const CONNECTORS_HEALTH_RATE_LIMIT = new InMemorySlidingWindowRateLimiter(10, 60_000);

// Plafond global (une seule clé, tous utilisateurs confondus) en complément du plafond par
// utilisateur ci-dessus : les identifiants tiers des connecteurs (FRANCE_TRAVAIL_CLIENT_ID,
// LBA_API_KEY, ...) sont des variables d'environnement partagées par toute l'app, pas des
// credentials par utilisateur — N comptes restant chacun sous leur propre plafond peuvent quand
// même, ensemble, épuiser un quota tiers ou déclencher un bannissement (relevé en revue de code
// sur JOB-59).
const CONNECTORS_HEALTH_GLOBAL_RATE_LIMIT_KEY = "global";
const CONNECTORS_HEALTH_GLOBAL_RATE_LIMIT = new InMemorySlidingWindowRateLimiter(20, 60_000);

export async function __resetConnectorsHealthRateLimitsForTests() {
  CONNECTORS_HEALTH_RATE_LIMIT.reset();
  CONNECTORS_HEALTH_GLOBAL_RATE_LIMIT.reset();
}

// Borne le temps d'attente d'un connecteur individuel : `healthCheck()` ne prend pas
// d'AbortSignal, donc un connecteur en panne réseau (pas de reset TCP) pourrait bloquer
// indéfiniment sans ce filet (JOB-59).
const CONNECTOR_HEALTH_CHECK_TIMEOUT_MS = 8000;

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

    // Best-effort : une erreur ici ne doit jamais faire échouer la collecte principale, ni
    // ralentir sa réponse au-delà du temps de sondage (pas de trigger dans le cron — voir la
    // spec — donc le coût réseau supplémentaire n'arrive qu'ici, à un moment où l'utilisateur
    // est déjà en train d'attendre le résultat de la collecte).
    try {
      await discoverTargets(prisma, auth.user.id, {});
    } catch (error) {
      logActionError("triggerCampaignCollection.discoverTargets", error, { userId: auth.user.id }, "warn");
    }

    revalidatePath("/harvester/review");
    revalidatePath("/harvester/discovery");
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

/**
 * Interroge en direct le `healthCheck()` de chaque connecteur enregistré
 * (ALL_CONNECTORS) — détecte une clé API expirée ou une source en panne de
 * façon proactive, sans attendre le prochain run raté (JOB-59). Le volet
 * "dernier run connu" est déjà couvert côté page (`prisma.connectorRun`,
 * non dupliqué ici).
 *
 * @errors `UNAUTHENTICATED`, `RATE_LIMITED`, `INTERNAL_ERROR`.
 */
export async function getConnectorsHealth(): Promise<ActionResult<{ health: ConnectorHealth[] }>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const limit = CONNECTORS_HEALTH_RATE_LIMIT.check(auth.user.id);
  if (!limit.allowed) {
    return actionError("RATE_LIMITED", rateLimitError(limit.retryAfterSeconds));
  }
  const globalLimit = CONNECTORS_HEALTH_GLOBAL_RATE_LIMIT.check(CONNECTORS_HEALTH_GLOBAL_RATE_LIMIT_KEY);
  if (!globalLimit.allowed) {
    return actionError("RATE_LIMITED", rateLimitError(globalLimit.retryAfterSeconds));
  }

  try {
    const settled = await Promise.allSettled(
      ALL_CONNECTORS.map((connector) =>
        healthCheckWithTimeout(connector.id, () => connector.healthCheck(), CONNECTOR_HEALTH_CHECK_TIMEOUT_MS)
      )
    );
    const health = settled.map((result, index) =>
      result.status === "fulfilled"
        ? result.value
        : {
            connectorId: ALL_CONNECTORS[index]!.id,
            ok: false,
            latencyMs: 0,
            checkedAt: new Date().toISOString(),
            message: result.reason instanceof Error ? result.reason.message : String(result.reason),
          }
    );
    return { ok: true, data: { health } };
  } catch (error) {
    logActionError("getConnectorsHealth", error, { userId: auth.user.id });
    return actionError("INTERNAL_ERROR", "Impossible de vérifier le statut des connecteurs");
  }
}
