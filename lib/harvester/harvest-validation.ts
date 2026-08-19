import { z } from "zod";

const idSchema = z.string().trim().min(1, "Identifiant invalide");

export const triggerCampaignCollectionSchema = z.object({
  campaignId: idSchema,
});

export const importHarvestedOfferSchema = z.object({
  offerId: idSchema,
});

export const ignoreHarvestedOfferSchema = z.object({
  offerId: idSchema,
});
