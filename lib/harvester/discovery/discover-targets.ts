import { Prisma, type DiscoveryPlatform, type PrismaClient } from "@prisma/client";
import { companySlug } from "@/lib/harvester/discovery/company-slug";
import { probeWorkday } from "@/lib/harvester/discovery/probe-workday";
import { probeSmartRecruiters } from "@/lib/harvester/discovery/probe-smartrecruiters";
import { probeTalentsoft } from "@/lib/harvester/discovery/probe-talentsoft";
import { probeDigitalRecruiters } from "@/lib/harvester/discovery/probe-digitalrecruiters";
import { createRateLimitedFetch } from "@/lib/harvester/rate-limited-fetch";

const DEFAULT_LIMIT = 20;
const ALL_PLATFORMS: DiscoveryPlatform[] = ["WORKDAY", "SMARTRECRUITERS", "TALENTSOFT", "DIGITALRECRUITERS"];

const sharedGuardedFetch = createRateLimitedFetch(fetch);

export interface DiscoverTargetsOptions {
  fetchImpl?: typeof fetch;
  limit?: number;
}

export interface DiscoverTargetsSummary {
  probed: number;
  found: number;
}

type ProbeResult = { ok: true; value: unknown | undefined } | { ok: false };

// Distingue "la sonde a tourné et a un résultat (trouvé ou pas)" de "la sonde a levé une
// exception" — seul le premier cas doit être écrit dans DiscoveryProbe, sous peine de
// transformer un incident réseau transitoire en "jamais retenté".
async function safeProbe(probe: () => Promise<unknown | undefined>): Promise<ProbeResult> {
  try {
    return { ok: true, value: await probe() };
  } catch {
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
    select: { companySlug: true, platform: true, found: true, target: true },
  });
  const probedPairs = new Set(existingProbes.map((p) => `${p.companySlug}::${p.platform}`));
  const isFullyProbed = (slug: string) => ALL_PLATFORMS.every((platform) => probedPairs.has(`${slug}::${platform}`));

  let foundCount = 0;

  // Cibles déjà connues (sondées par un autre utilisateur avant celui-ci) : créer la
  // DiscoveredTarget de cet utilisateur sans re-sonder, avant même de compter le plafond.
  for (const probe of existingProbes) {
    if (!probe.found || probe.target === null) continue;
    if (!candidates.has(probe.companySlug)) continue;
    const created = await createDiscoveredTargetIfMissing(prisma, userId, probe.companySlug, candidates.get(probe.companySlug)!, probe.platform, probe.target);
    if (created) foundCount += 1;
  }

  const toProbe = [...candidates.keys()].filter((slug) => !isFullyProbed(slug)).slice(0, limit);

  for (const slug of toProbe) {
    const companyName = candidates.get(slug)!;
    for (const platform of ALL_PLATFORMS) {
      if (probedPairs.has(`${slug}::${platform}`)) continue;
      const result = await safeProbe(() => PROBES[platform](slug, fetchImpl));
      if (!result.ok) continue;
      await prisma.discoveryProbe.create({
        data: {
          companySlug: slug,
          platform,
          found: result.value !== undefined,
          target: (result.value as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
        },
      });
      if (result.value !== undefined) {
        const created = await createDiscoveredTargetIfMissing(prisma, userId, slug, companyName, platform, result.value);
        if (created) foundCount += 1;
      }
    }
  }

  return { probed: toProbe.length, found: foundCount };
}

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
  await prisma.discoveredTarget.create({
    data: { userId, companySlug: companySlugValue, companyName, platform, target: target as object },
  });
  return true;
}
