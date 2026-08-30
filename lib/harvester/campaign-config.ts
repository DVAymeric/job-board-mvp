import { z } from "zod";
import type { Prisma, OfferContractType } from "@prisma/client";
import { ContractTypeSchema, type ContractType } from "@/lib/harvester/normalized-offer";
import { HarvestTargetsSchema, type HarvestTargets } from "@/lib/harvester/harvest-query";

// L'enum Prisma OfferContractType (prisma/schema.prisma) est en MAJUSCULES ;
// le YAML source de job-harvester (config/campaigns.yaml) utilise les
// valeurs minuscules de ContractTypeSchema ("apprentissage", etc. — voir
// lib/harvester/normalized-offer.ts). CampaignConfigSchema valide donc le
// format source tel quel ; la conversion vers l'enum Prisma se fait dans
// mapYamlCampaignToCreateInput, pas ici.
const CONTRACT_TYPE_TO_PRISMA_ENUM: Record<ContractType, OfferContractType> = {
  apprentissage: "APPRENTISSAGE",
  professionnalisation: "PROFESSIONNALISATION",
  stage: "STAGE",
  cdi: "CDI",
  cdd: "CDD",
  autre: "AUTRE",
};

export const LocationConfigSchema = z.object({
  label: z.string(),
  lat: z.number(),
  lng: z.number(),
  radiusKm: z.number(),
});
export type LocationConfig = z.infer<typeof LocationConfigSchema>;

// Format de config hérité de job-harvester (config/campaigns.yaml) — `id` y
// désigne le slug de la campagne, distinct de l'id (uuid) Prisma généré à
// l'insertion.
export const CampaignConfigSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  romeCodes: z.array(z.string()),
  keywords: z.array(z.string()),
  locations: z.array(LocationConfigSchema),
  contractTypes: z.array(ContractTypeSchema),
  targets: HarvestTargetsSchema.optional(),
  schedule: z.string().optional(),
});
export type CampaignConfig = z.infer<typeof CampaignConfigSchema>;

export const CampaignsFileSchema = z.object({
  campaigns: z.array(CampaignConfigSchema),
});

// Relecture d'une `Campaign.config` déjà en base, quand seules les cibles importent :
// `locations` est laissé opaque (déjà validé à l'écriture par resolveLocations) pour que ce
// parse ne casse pas si le format des localisations évolue. Schéma partagé par
// app/actions/discovery.ts et app/actions/campaigns.ts — ne pas en réintroduire une copie
// locale (l'orchestrateur et le formulaire de campagne en ont chacun une variante plus
// stricte, volontairement, car ils ont besoin des localisations typées).
export const StoredCampaignConfigSchema = z.object({
  locations: z.array(z.unknown()),
  targets: HarvestTargetsSchema.optional(),
});

/**
 * Cibles déjà stockées dans `campaign.config` — `{}` si la config est absente ou illisible.
 * Sert à préserver, lors d'une réécriture partielle de `config`, les clés de cibles qu'un
 * appelant ne gère pas (ex. `talentsoft`/`digitalRecruiters` approuvées depuis
 * /harvester/discovery, absentes du formulaire de campagne).
 */
export function storedCampaignTargets(config: unknown): HarvestTargets {
  const parsed = StoredCampaignConfigSchema.safeParse(config);
  return parsed.success ? (parsed.data.targets ?? {}) : {};
}

/**
 * Traduit une campagne au format YAML de job-harvester en données de
 * création Prisma pour le modèle Campaign (JOB-44) — `id` (slug YAML) ↦
 * `slug`, `contractTypes` reconverti vers l'enum Prisma en majuscules,
 * `locations`/`targets` regroupés dans `config` (Json), le reste en
 * colonnes typées. Pure : ni lecture de fichier, ni accès DB, pour rester
 * testable sans fixture disque ni Postgres.
 */
export function mapYamlCampaignToCreateInput(
  config: CampaignConfig,
  userId: string
): Prisma.CampaignUncheckedCreateInput {
  return {
    userId,
    slug: config.id,
    name: config.name,
    romeCodes: config.romeCodes,
    keywords: config.keywords,
    contractTypes: config.contractTypes.map((type) => CONTRACT_TYPE_TO_PRISMA_ENUM[type]),
    schedule: config.schedule,
    config: {
      locations: config.locations,
      ...(config.targets ? { targets: config.targets } : {}),
    },
  };
}
