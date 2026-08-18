import { z } from "zod";
import { LocationConfigSchema } from "@/lib/harvester/campaign-config";
import { HarvestTargetsSchema } from "@/lib/harvester/harvest-query";

// Valeurs de l'enum Prisma OfferContractType (prisma/schema.prisma) — ce
// schéma valide l'entrée des Server Actions CRUD (format déjà Prisma,
// majuscules), à ne pas confondre avec ContractTypeSchema (minuscules,
// format YAML source — voir lib/harvester/campaign-config.ts).
const CAMPAIGN_CONTRACT_TYPES = ["APPRENTISSAGE", "PROFESSIONNALISATION", "STAGE", "AUTRE"] as const;

const campaignIdSchema = z.string().trim().min(1, "Identifiant invalide");

const slugSchema = z
  .string()
  .trim()
  .min(1, "Identifiant de campagne requis")
  .max(80, "Identifiant de campagne trop long (80 caractères max)")
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Identifiant invalide (minuscules, chiffres, tirets)");

const campaignFieldsSchema = {
  slug: slugSchema,
  romeCodes: z.array(z.string().trim().min(1)).default([]),
  keywords: z.array(z.string().trim().min(1)).default([]),
  contractTypes: z.array(z.enum(CAMPAIGN_CONTRACT_TYPES)).min(1, "Au moins un type de contrat"),
  locations: z.array(LocationConfigSchema).min(1, "Au moins une localisation"),
  targets: HarvestTargetsSchema.optional(),
  schedule: z.string().trim().min(1).optional(),
};

export const createCampaignSchema = z.object(campaignFieldsSchema);

export const updateCampaignSchema = z.object({
  campaignId: campaignIdSchema,
  ...campaignFieldsSchema,
});

export const deleteCampaignSchema = z.object({
  campaignId: campaignIdSchema,
});
