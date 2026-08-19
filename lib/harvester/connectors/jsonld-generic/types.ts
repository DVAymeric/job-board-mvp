import { z } from "zod";

// Whitelist des champs schema.org/JobPosting standard réellement utilisés (JOB-58). Tout le
// reste présent dans le JSON-LD d'une page (y compris un bloc de contact recruteur) est retiré
// par le comportement par défaut de Zod ("strip unknown keys") — même posture anti-PII que les
// autres connecteurs (ADR-0004). Particulièrement important ici : ce tier scrape des pages
// tierces génériques, sans contrôle sur leur structure.
export const JobPostingSchema = z.object({
  title: z.string(),
  description: z.string(),
  datePosted: z.string().optional(),
  validThrough: z.string().optional(),
  hiringOrganization: z.object({ name: z.string().optional() }).optional(),
  jobLocation: z
    .object({
      address: z
        .object({
          addressLocality: z.string().optional(),
          postalCode: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
  employmentType: z.union([z.string(), z.array(z.string())]).optional(),
  identifier: z.object({ value: z.string().optional() }).optional(),
  // Absent des champs schema.org listés explicitement par le ticket, mais nécessaire pour
  // construire une URL canonique par offre : une page carrière peut embarquer plusieurs entrées
  // JobPosting (via @graph ou un tableau), chacune pointant vers sa propre page de détail.
  // Repli sur l'URL de la page si absent.
  url: z.string().optional(),
});
export type JobPosting = z.infer<typeof JobPostingSchema>;

export const JsonLdRawOfferSchema = z.object({
  pageUrl: z.string(),
  jobPosting: JobPostingSchema,
});
export type JsonLdRawOffer = z.infer<typeof JsonLdRawOfferSchema>;
