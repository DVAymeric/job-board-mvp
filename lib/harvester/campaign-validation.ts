import { z } from "zod";
import { HarvestTargetsSchema } from "@/lib/harvester/harvest-query";

// Valeurs de l'enum Prisma OfferContractType (prisma/schema.prisma) — ce
// schéma valide l'entrée des Server Actions CRUD (format déjà Prisma,
// majuscules), à ne pas confondre avec ContractTypeSchema (minuscules,
// format YAML source — voir lib/harvester/campaign-config.ts).
export const CAMPAIGN_CONTRACT_TYPES = ["APPRENTISSAGE", "PROFESSIONNALISATION", "STAGE", "CDI", "CDD", "AUTRE"] as const;
export type CampaignContractType = (typeof CAMPAIGN_CONTRACT_TYPES)[number];

export const CAMPAIGN_CONTRACT_TYPE_LABELS: Record<CampaignContractType, string> = {
  APPRENTISSAGE: "Apprentissage",
  PROFESSIONNALISATION: "Professionnalisation",
  STAGE: "Stage",
  CDI: "CDI",
  CDD: "CDD",
  AUTRE: "Autre",
};

const campaignIdSchema = z.string().trim().min(1, "Identifiant invalide");

// JOB-59 (suite) : la campagne n'expose plus lat/lng côté formulaire — seul le nom de ville est
// saisi, le géocodage (lib/harvester/geocoding.ts) résout les coordonnées côté serveur avant
// stockage. Distinct de LocationConfigSchema (campaign-config.ts), qui reste la forme stockée
// (avec lat/lng) utilisée aussi par l'import YAML legacy, non concerné par ce formulaire.
const campaignLocationInputSchema = z.object({
  label: z.string().trim().min(1, "Ville requise"),
  radiusKm: z.number().positive("Rayon invalide"),
});

// L'identifiant (slug) n'est plus saisi par l'utilisateur — généré côté serveur à partir des
// mots-clés (slugifyKeywords) à la création, puis jamais modifié (campaigns.ts).
const campaignFieldsSchema = {
  // Nom d'affichage optionnel, distinct du slug technique — voir prisma/schema.prisma.
  name: z.string().trim().min(1).optional(),
  romeCodes: z.array(z.string().trim().min(1)).default([]),
  keywords: z.array(z.string().trim().min(1)).default([]),
  metiers: z.array(z.string().trim().min(1)).default([]),
  contractTypes: z.array(z.enum(CAMPAIGN_CONTRACT_TYPES)).min(1, "Au moins un type de contrat"),
  locations: z.array(campaignLocationInputSchema).min(1, "Au moins une localisation"),
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
