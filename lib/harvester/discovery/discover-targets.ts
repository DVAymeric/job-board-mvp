import { Prisma, type DiscoveryPlatform, type PrismaClient } from "@prisma/client";
import { companySlug } from "@/lib/harvester/discovery/company-slug";
import { probeWorkday } from "@/lib/harvester/discovery/probe-workday";
import { probeSmartRecruiters } from "@/lib/harvester/discovery/probe-smartrecruiters";
import { probeTalentsoft } from "@/lib/harvester/discovery/probe-talentsoft";
import { probeDigitalRecruiters } from "@/lib/harvester/discovery/probe-digitalrecruiters";
import { createRateLimitedFetch } from "@/lib/harvester/rate-limited-fetch";
import { isUniqueConstraintError } from "@/lib/prisma-errors";
import { logger } from "@/lib/logger";

const DEFAULT_LIMIT = 20;
const ALL_PLATFORMS: DiscoveryPlatform[] = ["WORKDAY", "SMARTRECRUITERS", "TALENTSOFT", "DIGITALRECRUITERS"];

// Durée de validité d'un verdict de sonde. Sans TTL, une entreprise qui adopte une plateforme
// plus tard n'est jamais redécouverte, et un faux positif reste figé pour tous les utilisateurs
// (le cache DiscoveryProbe est global). 60 jours : assez long pour que le re-sondage reste
// marginal en volume, assez court pour qu'une erreur se corrige d'elle-même en deux mois.
const PROBE_TTL_DAYS = 60;
const PROBE_TTL_MS = PROBE_TTL_DAYS * 24 * 60 * 60 * 1000;

// Budget mural du sondage. discoverTargets est appelé via `after()` (hors du chemin de réponse,
// cf. app/actions/harvest.ts), mais la fonction serverless qui l'héberge garde une durée de vie
// plafonnée : 4 min laisse une marge confortable sous les limites usuelles (5-15 min) et vaut
// mieux que d'être tué au milieu d'un run. Vérifié entre deux sondes, jamais pendant.
const DEFAULT_BUDGET_MS = 4 * 60 * 1000;

const sharedGuardedFetch = createRateLimitedFetch(fetch);

export interface DiscoverTargetsOptions {
  fetchImpl?: typeof fetch;
  limit?: number;
  /** Budget mural en ms avant d'arrêter de lancer de nouvelles sondes (défaut : 4 min). */
  budgetMs?: number;
}

export interface DiscoverTargetsSummary {
  probed: number;
  found: number;
}

type ProbeResult = { ok: true; value: unknown | undefined } | { ok: false };

// Distingue "la sonde a tourné et a un résultat (trouvé ou pas)" de "la sonde a levé une
// exception" — seul le premier cas doit être écrit dans DiscoveryProbe, sous peine de
// transformer un incident réseau transitoire en "jamais retenté".
async function safeProbe(
  slug: string,
  platform: DiscoveryPlatform,
  probe: () => Promise<unknown | undefined>
): Promise<ProbeResult> {
  try {
    return { ok: true, value: await probe() };
  } catch (error) {
    logger.warn("harvester.discovery.probe_failed", {
      companySlug: slug,
      platform,
      error: error instanceof Error ? error.message : String(error),
    });
    return { ok: false };
  }
}

const PROBES: Record<DiscoveryPlatform, (slug: string, fetchImpl: typeof fetch) => Promise<unknown | undefined>> = {
  WORKDAY: probeWorkday,
  SMARTRECRUITERS: probeSmartRecruiters,
  TALENTSOFT: probeTalentsoft,
  DIGITALRECRUITERS: probeDigitalRecruiters,
};

export async function discoverTargets(
  prisma: PrismaClient,
  userId: string,
  options: DiscoverTargetsOptions = {}
): Promise<DiscoverTargetsSummary> {
  const fetchImpl = options.fetchImpl ?? sharedGuardedFetch;
  const limit = options.limit ?? DEFAULT_LIMIT;
  const budgetMs = options.budgetMs ?? DEFAULT_BUDGET_MS;
  const startedAt = Date.now();
  const budgetExhausted = () => Date.now() - startedAt >= budgetMs;

  const offers = await prisma.harvestedOffer.findMany({
    where: { userId },
    distinct: ["companyNormalizedName"],
    select: { companyName: true, companyNormalizedName: true },
  });

  const candidates = new Map<string, string>(); // slug -> companyName (première occurrence)
  for (const offer of offers) {
    const slug = companySlug(offer.companyName);
    if (slug.length > 0 && !candidates.has(slug)) candidates.set(slug, offer.companyName);
  }

  const existingProbes = await prisma.discoveryProbe.findMany({
    where: { companySlug: { in: [...candidates.keys()] } },
    select: { companySlug: true, platform: true, found: true, target: true, probedAt: true },
  });
  // Un verdict périmé (probedAt > TTL) est traité exactement comme une absence de ligne : la
  // paire redevient sondable, et le upsert ci-dessous rafraîchira found/target/probedAt.
  const isFresh = (probedAt: Date) => Date.now() - probedAt.getTime() < PROBE_TTL_MS;
  const freshPairs = new Set(
    existingProbes.filter((p) => isFresh(p.probedAt)).map((p) => `${p.companySlug}::${p.platform}`)
  );
  const isFullyProbed = (slug: string) => ALL_PLATFORMS.every((platform) => freshPairs.has(`${slug}::${platform}`));

  let foundCount = 0;

  // Cibles déjà connues (sondées par un autre utilisateur avant celui-ci) : créer la
  // DiscoveredTarget de cet utilisateur sans re-sonder, avant même de compter le plafond.
  for (const probe of existingProbes) {
    if (!isFresh(probe.probedAt)) continue;
    if (!probe.found || probe.target === null) continue;
    if (!candidates.has(probe.companySlug)) continue;
    const created = await createDiscoveredTargetIfMissing(prisma, userId, probe.companySlug, candidates.get(probe.companySlug)!, probe.platform, probe.target);
    if (created) foundCount += 1;
  }

  const toProbe = [...candidates.keys()].filter((slug) => !isFullyProbed(slug)).slice(0, limit);

  let probedCount = 0;
  for (const slug of toProbe) {
    if (budgetExhausted()) break;
    const companyName = candidates.get(slug)!;
    probedCount += 1;
    for (const platform of ALL_PLATFORMS) {
      if (freshPairs.has(`${slug}::${platform}`)) continue;
      if (budgetExhausted()) break;
      const result = await safeProbe(slug, platform, () => PROBES[platform](slug, fetchImpl));
      if (!result.ok) continue;
      await recordProbe(prisma, slug, platform, result.value);
      if (result.value !== undefined) {
        const created = await createDiscoveredTargetIfMissing(prisma, userId, slug, companyName, platform, result.value);
        if (created) foundCount += 1;
      }
    }
  }

  return { probed: probedCount, found: foundCount };
}

/**
 * Écrit le verdict d'une sonde dans le cache global DiscoveryProbe. `upsert` et non `create` :
 * la table est délibérément partagée par tous les utilisateurs (@@unique([companySlug,
 * platform]), pas de userId), donc deux collectes concurrentes voyant la même entreprise se
 * courent après. Une collision est bénigne — l'écriture perdante posait le même verdict — et
 * ne doit pas interrompre le reste du run. Le catch P2002 couvre la course qui passe entre le
 * SELECT et l'INSERT du upsert lui-même.
 */
async function recordProbe(
  prisma: PrismaClient,
  companySlugValue: string,
  platform: DiscoveryPlatform,
  value: unknown | undefined
): Promise<void> {
  const data = {
    found: value !== undefined,
    target: (value as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
  };
  try {
    await prisma.discoveryProbe.upsert({
      where: { companySlug_platform: { companySlug: companySlugValue, platform } },
      create: { companySlug: companySlugValue, platform, ...data },
      update: { ...data, probedAt: new Date() },
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
    logger.warn("harvester.discovery.probe_write_raced", { companySlug: companySlugValue, platform });
  }
}

/**
 * `findUnique` puis `create` plutôt que `upsert` : la valeur de retour ("j'en ai créé une")
 * alimente le compteur `found`, et un upsert écraserait le `status` d'une ligne déjà revue
 * (ADDED/REJECTED). Le catch P2002 traite la course concurrente (deux collectes du même
 * utilisateur qui se chevauchent) comme "quelqu'un vient de la créer", sans casser le run.
 */
async function createDiscoveredTargetIfMissing(
  prisma: PrismaClient,
  userId: string,
  companySlugValue: string,
  companyName: string,
  platform: DiscoveryPlatform,
  target: unknown
): Promise<boolean> {
  const existing = await prisma.discoveredTarget.findUnique({
    where: { userId_companySlug_platform: { userId, companySlug: companySlugValue, platform } },
  });
  if (existing) return false;
  try {
    await prisma.discoveredTarget.create({
      data: { userId, companySlug: companySlugValue, companyName, platform, target: target as object },
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
    return false;
  }
  return true;
}
