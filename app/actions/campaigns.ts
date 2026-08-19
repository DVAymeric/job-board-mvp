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
import { resolveLocations } from "@/lib/harvester/geocoding";
import { slugifyKeywords } from "@/lib/harvester/campaign-slug";
import {
  actionError,
  campaignOwnerWhere,
  type ActionResult,
  firstIssueMessage,
  logActionError,
} from "./_shared";

// Nombre de tentatives avant d'abandonner un slug auto-généré en collision (JOB-59 suite) —
// collision peu probable (slug dérivé des mots-clés, scope par utilisateur) mais possible si
// deux campagnes du même utilisateur partagent les mêmes mots-clés.
const MAX_SLUG_ATTEMPTS = 5;

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

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
 * Crée une campagne de collecte. `slug` n'est pas un paramètre d'entrée :
 * généré côté serveur à partir des mots-clés (slugifyKeywords), avec retry
 * suffixé en cas de collision — l'utilisateur ne saisit qu'un nom de ville
 * par localisation, géocodé ici (resolveLocations) pour produire lat/lng.
 *
 * @param input.contractTypes Au moins un type de contrat visé.
 * @param input.locations Au moins une localisation ({label, radiusKm}).
 * @errors `UNAUTHENTICATED`, `VALIDATION_ERROR` (dont ville introuvable),
 * `CONFLICT` (retries de slug épuisés), `INTERNAL_ERROR`.
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

  const resolved = await resolveLocations(parsed.data.locations);
  if (!resolved.ok) {
    return actionError("VALIDATION_ERROR", `Ville introuvable : « ${resolved.unresolvedLabel} »`);
  }

  const { locations: _locations, targets, ...fields } = parsed.data;
  const config = { locations: resolved.locations, ...(targets ? { targets } : {}) };
  const baseSlug = slugifyKeywords(parsed.data.keywords);

  try {
    for (let attempt = 1; ; attempt++) {
      const slug = attempt === 1 ? baseSlug : `${baseSlug}-${attempt}`;
      try {
        const campaign = await prisma.campaign.create({
          data: { ...fields, slug, userId: auth.user.id, config },
        });
        revalidatePath("/harvester/campaigns");
        return { ok: true, data: { campaign } };
      } catch (error) {
        if (!isUniqueConstraintError(error) || attempt >= MAX_SLUG_ATTEMPTS) throw error;
      }
    }
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return actionError("CONFLICT", "Une campagne avec cet identifiant existe déjà");
    }
    logActionError("createCampaign", error, { userId: auth.user.id });
    return actionError("INTERNAL_ERROR", "Impossible de créer cette campagne");
  }
}

/**
 * Met à jour une campagne existante (remplacement complet des champs
 * modifiables — pas de mise à jour partielle). Le slug n'est pas modifiable
 * après création (généré une seule fois par createCampaign).
 *
 * @errors `UNAUTHENTICATED`, `VALIDATION_ERROR` (dont ville introuvable),
 * `INTERNAL_ERROR` (y compris campagne introuvable pour cet utilisateur —
 * P2025 Prisma, non distingué d'une autre erreur d'écriture, comme
 * updateContact).
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

  const resolved = await resolveLocations(parsed.data.locations);
  if (!resolved.ok) {
    return actionError("VALIDATION_ERROR", `Ville introuvable : « ${resolved.unresolvedLabel} »`);
  }

  try {
    const { campaignId, locations: _locations, targets, ...fields } = parsed.data;
    const campaign = await prisma.campaign.update({
      where: campaignOwnerWhere(campaignId, auth.user.id),
      data: {
        ...fields,
        config: { locations: resolved.locations, ...(targets ? { targets } : {}) },
      },
    });
    revalidatePath("/harvester/campaigns");
    return { ok: true, data: { campaign } };
  } catch (error) {
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
