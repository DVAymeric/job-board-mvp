"use server";

import { revalidatePath } from "next/cache";
import { Prisma, type Campaign } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import {
  createCampaignSchema,
  deleteCampaignSchema,
  updateCampaignSchema,
} from "@/lib/harvester/campaign-validation";
import {
  actionError,
  campaignOwnerWhere,
  type ActionResult,
  firstIssueMessage,
  logActionError,
} from "./_shared";

/**
 * Liste les campagnes de collecte de l'utilisateur courant.
 *
 * @errors `UNAUTHENTICATED`, `INTERNAL_ERROR`.
 */
export async function listCampaigns(): Promise<ActionResult<{ campaigns: Campaign[] }>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  try {
    const campaigns = await prisma.campaign.findMany({
      where: { userId: auth.user.id },
      orderBy: { createdAt: "desc" },
    });
    return { ok: true, data: { campaigns } };
  } catch (error) {
    logActionError("listCampaigns", error, { userId: auth.user.id });
    return actionError("INTERNAL_ERROR", "Impossible de charger les campagnes");
  }
}

/**
 * Crée une campagne de collecte.
 *
 * @param input.slug Identifiant court, unique par utilisateur (minuscules,
 * chiffres, tirets).
 * @param input.contractTypes Au moins un type de contrat visé.
 * @param input.locations Au moins une localisation ({label, lat, lng, radiusKm}).
 * @errors `UNAUTHENTICATED`, `VALIDATION_ERROR`, `CONFLICT` (slug déjà pris
 * par cet utilisateur), `INTERNAL_ERROR`.
 */
export async function createCampaign(
  input: unknown
): Promise<ActionResult<{ campaign: Campaign }>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const parsed = createCampaignSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(
      "VALIDATION_ERROR",
      firstIssueMessage(parsed.error, "Impossible de créer cette campagne")
    );
  }
  try {
    const { locations, targets, ...fields } = parsed.data;
    const campaign = await prisma.campaign.create({
      data: {
        ...fields,
        userId: auth.user.id,
        config: { locations, ...(targets ? { targets } : {}) },
      },
    });
    revalidatePath("/harvester/campaigns");
    return { ok: true, data: { campaign } };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return actionError("CONFLICT", "Une campagne avec cet identifiant existe déjà");
    }
    logActionError("createCampaign", error, { userId: auth.user.id });
    return actionError("INTERNAL_ERROR", "Impossible de créer cette campagne");
  }
}

/**
 * Met à jour une campagne existante (remplacement complet des champs
 * modifiables — pas de mise à jour partielle).
 *
 * @errors `UNAUTHENTICATED`, `VALIDATION_ERROR`, `CONFLICT`, `INTERNAL_ERROR`
 * (y compris campagne introuvable pour cet utilisateur — P2025 Prisma, non
 * distingué d'une autre erreur d'écriture, comme updateContact).
 */
export async function updateCampaign(
  input: unknown
): Promise<ActionResult<{ campaign: Campaign }>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const parsed = updateCampaignSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(
      "VALIDATION_ERROR",
      firstIssueMessage(parsed.error, "Impossible de modifier cette campagne")
    );
  }
  try {
    const { campaignId, locations, targets, ...fields } = parsed.data;
    const campaign = await prisma.campaign.update({
      where: campaignOwnerWhere(campaignId, auth.user.id),
      data: {
        ...fields,
        config: { locations, ...(targets ? { targets } : {}) },
      },
    });
    revalidatePath("/harvester/campaigns");
    return { ok: true, data: { campaign } };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return actionError("CONFLICT", "Une campagne avec cet identifiant existe déjà");
    }
    logActionError("updateCampaign", error, { userId: auth.user.id });
    return actionError("INTERNAL_ERROR", "Impossible de modifier cette campagne");
  }
}

/**
 * Supprime définitivement une campagne (les offres déjà collectées via
 * `HarvestedOffer.campaignId` sont supprimées en cascade — voir
 * prisma/schema.prisma).
 *
 * @errors `UNAUTHENTICATED`, `VALIDATION_ERROR`, `INTERNAL_ERROR`.
 */
export async function deleteCampaign(input: unknown): Promise<ActionResult<null>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const parsed = deleteCampaignSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(
      "VALIDATION_ERROR",
      firstIssueMessage(parsed.error, "Impossible de supprimer cette campagne")
    );
  }
  try {
    await prisma.campaign.delete({
      where: campaignOwnerWhere(parsed.data.campaignId, auth.user.id),
    });
    revalidatePath("/harvester/campaigns");
    return { ok: true, data: null };
  } catch (error) {
    logActionError("deleteCampaign", error, { userId: auth.user.id });
    return actionError("INTERNAL_ERROR", "Impossible de supprimer cette campagne");
  }
}
