import { z } from "zod";

export const TalentsoftRssItemSchema = z.object({
  link: z.string(),
  title: z.string(),
  description: z.string(),
  categories: z.array(z.string()),
});
export type TalentsoftRssItem = z.infer<typeof TalentsoftRssItemSchema>;

// Le handler RSS lui-même ne porte aucun domaine — client.ts l'injecte dans ce wrapper composite
// pour que normalize.ts puisse dériver un nom d'entreprise et reconstruire une URL canonique
// absolue depuis une URL relative, comme smartrecruiters/digitalrecruiters le font déjà avec
// leur slug/domaine par entreprise (JOB-34).
export const TalentsoftRawOfferSchema = z.object({
  domain: z.string(),
  item: TalentsoftRssItemSchema,
});
export type TalentsoftRawOffer = z.infer<typeof TalentsoftRawOfferSchema>;
