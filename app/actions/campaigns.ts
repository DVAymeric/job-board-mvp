"use server";

import { revalidatePath } from "next/cache";
import type { Campaign } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isUniqueConstraintError } from "@/lib/prisma-errors";
import { requireUser } from "@/lib/auth/session";
import {
  createCampaignSchema,
  deleteCampaignSchema,
  reorderCampaignsSchema,
  updateCampaignSchema,
} from "@/lib/harvester/campaign-validation";
import { searchRomeReferentiel, type MetierMatch } from "@/lib/harvester/rome-search";
import { resolveLocations } from "@/lib/harvester/geocoding";
import { slugifyKeywords } from "@/lib/harvester/campaign-slug";
import { storedCampaignTargets } from "@/lib/harvester/campaign-config";
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
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });
    return { ok: true, data: { campaigns } };
  } catch (error) {
    logActionError("listCampaigns", error, { userId: auth.user.id });
    return actionError("INTERNAL_ERROR", "Impossible de charger les campagnes");
  }
}

/**
 * Recherche floue de métiers sur le référentiel ROME officiel, pour le champ "Métier
 * recherché" du formulaire de campagne — ne modifie rien, retourne des candidats que
 * l'utilisateur choisit explicitement côté client.
 *
 * @errors `UNAUTHENTICATED`.
 */
export async function searchMetiers(query: string): Promise<ActionResult<{ matches: MetierMatch[] }>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  return { ok: true, data: { matches: searchRomeReferentiel(query) } };
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

    // `config` est un champ Json réécrit en entier à chaque update : sans fusion, toute clé de
    // `config.targets` que l'appelant ne gère pas serait détruite silencieusement. Le
    // formulaire de campagne ne pilote que `workday` et `smartrecruiters` ; les cibles
    // approuvées depuis /harvester/discovery (`talentsoft`, `digitalRecruiters`, et toute
    // plateforme future) sont donc reportées telles quelles depuis la config stockée.
    const stored = await prisma.campaign.findUnique({
      where: campaignOwnerWhere(campaignId, auth.user.id),
      select: { config: true },
    });
    const { workday: _workday, smartrecruiters: _smartrecruiters, ...carriedOverTargets } =
      storedCampaignTargets(stored?.config);
    const mergedTargets = { ...carriedOverTargets, ...(targets ?? {}) };

    const campaign = await prisma.campaign.update({
      where: campaignOwnerWhere(campaignId, auth.user.id),
      data: {
        ...fields,
        config: {
          locations: resolved.locations,
          ...(Object.keys(mergedTargets).length > 0 ? { targets: mergedTargets } : {}),
        },
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

/**
 * Persiste un nouvel ordre d'affichage pour les campagnes de l'utilisateur
 * courant, après un glisser-déposer dans l'onglet Campagnes (même pattern
 * que reorderJobs pour le Board).
 *
 * @param input.orderedIds IDs des campagnes dans leur nouvel ordre — chaque
 * id doit appartenir à l'utilisateur courant, sinon la transaction échoue
 * entière (aucune mise à jour partielle).
 * @errors `UNAUTHENTICATED`, `VALIDATION_ERROR` (liste vide), `INTERNAL_ERROR`.
 */
export async function reorderCampaigns(input: unknown): Promise<ActionResult<null>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const parsed = reorderCampaignsSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(
      "VALIDATION_ERROR",
      firstIssueMessage(parsed.error, "Impossible de réordonner les campagnes")
    );
  }
  try {
    await prisma.$transaction(
      parsed.data.orderedIds.map((id, index) =>
        prisma.campaign.update({
          where: campaignOwnerWhere(id, auth.user.id),
          data: { order: index },
        })
      )
    );
    revalidatePath("/harvester/campaigns");
    return { ok: true, data: null };
  } catch (error) {
    logActionError("reorderCampaigns", error, { userId: auth.user.id });
    return actionError("INTERNAL_ERROR", "Impossible de réordonner les campagnes");
  }
}
