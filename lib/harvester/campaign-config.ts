import { z } from "zod";
import type { Prisma, OfferContractType } from "@prisma/client";
import { ContractTypeSchema, type ContractType } from "@/lib/harvester/normalized-offer";
import { HarvestTargetsSchema } from "@/lib/harvester/harvest-query";

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
