"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { approveDiscoveredTargetSchema, rejectDiscoveredTargetSchema } from "@/lib/harvester/discovery-validation";
import { StoredCampaignConfigSchema } from "@/lib/harvester/campaign-config";
import { actionError, type ActionResult, firstIssueMessage, logActionError } from "./_shared";

const PLATFORM_TO_TARGETS_KEY = {
  WORKDAY: "workday",
  SMARTRECRUITERS: "smartrecruiters",
  TALENTSOFT: "talentsoft",
  DIGITALRECRUITERS: "digitalRecruiters",
} as const;

/**
 * Approuve une cible découverte : l'ajoute à `config.targets` de chaque campagne de
 * l'utilisateur (dédupliqué), puis marque la ligne ADDED.
 *
 * @errors `UNAUTHENTICATED`, `VALIDATION_ERROR`, `NOT_FOUND` (cible introuvable pour cet
 * utilisateur), `INTERNAL_ERROR`.
 */
export async function approveDiscoveredTarget(input: unknown): Promise<ActionResult<null>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const parsed = approveDiscoveredTargetSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", firstIssueMessage(parsed.error, "Impossible d'approuver cette cible"));
  }

  try {
    const target = await prisma.discoveredTarget.findFirst({
      where: { id: parsed.data.targetId, userId: auth.user.id },
    });
    if (!target) {
      return actionError("NOT_FOUND", "Cible introuvable");
    }

    const targetsKey = PLATFORM_TO_TARGETS_KEY[target.platform];
    const campaigns = await prisma.campaign.findMany({ where: { userId: auth.user.id } });

    for (const campaign of campaigns) {
      const config = StoredCampaignConfigSchema.parse(campaign.config);
      const existingList = (config.targets?.[targetsKey] ?? []) as unknown[];
      const alreadyPresent = existingList.some((item) => JSON.stringify(item) === JSON.stringify(target.target));
      if (alreadyPresent) continue;

      const nextConfig = {
        ...config,
        targets: { ...config.targets, [targetsKey]: [...existingList, target.target] },
      };
      // Cast : `StoredCampaignConfigSchema` infère `locations: unknown[]` (Zod), qui n'obtient pas
      // implicitement la signature d'index structurelle qu'exige Prisma.InputJsonValue (même
      // raison que le commentaire sur GeocodedCity dans geocoding.ts) — la valeur est déjà un
      // JSON valide (relu depuis `campaign.config` puis étendu), seul le type TS est trop strict.
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { config: nextConfig as Prisma.InputJsonValue },
      });
    }

    await prisma.discoveredTarget.update({
      where: { id: target.id },
      data: { status: "ADDED", reviewedAt: new Date() },
    });

    revalidatePath("/harvester/discovery");
    revalidatePath("/harvester/campaigns");
    return { ok: true, data: null };
  } catch (error) {
    logActionError("approveDiscoveredTarget", error, { userId: auth.user.id });
    return actionError("INTERNAL_ERROR", "Impossible d'approuver cette cible");
  }
}

/**
 * Rejette une cible découverte — ne modifie aucune campagne. Pas d'annulation possible (YAGNI).
 *
 * @errors `UNAUTHENTICATED`, `VALIDATION_ERROR`, `NOT_FOUND`, `INTERNAL_ERROR`.
 */
export async function rejectDiscoveredTarget(input: unknown): Promise<ActionResult<null>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const parsed = rejectDiscoveredTargetSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", firstIssueMessage(parsed.error, "Impossible de rejeter cette cible"));
  }

  try {
    const target = await prisma.discoveredTarget.findFirst({
      where: { id: parsed.data.targetId, userId: auth.user.id },
    });
    if (!target) {
      return actionError("NOT_FOUND", "Cible introuvable");
    }

    await prisma.discoveredTarget.update({
      where: { id: target.id },
      data: { status: "REJECTED", reviewedAt: new Date() },
    });

    revalidatePath("/harvester/discovery");
    return { ok: true, data: null };
  } catch (error) {
    logActionError("rejectDiscoveredTarget", error, { userId: auth.user.id });
    return actionError("INTERNAL_ERROR", "Impossible de rejeter cette cible");
  }
}
