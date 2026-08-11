import { z } from "zod";
import { normalizeUrl } from "@/lib/url";
import { STATUS } from "@/lib/constants";

const urlSchema = z
  .string()
  .trim()
  .min(1, "URL invalide")
  .transform((value, ctx) => {
    try {
      return normalizeUrl(value);
    } catch {
      ctx.addIssue({ code: "custom", message: "URL invalide" });
      return z.NEVER;
    }
  });

const jobIdSchema = z.string().trim().min(1, "Identifiant invalide");

export const checkJobUrlSchema = urlSchema;

export const createJobSchema = z.object({
  url: urlSchema,
  title: z.string().trim().optional(),
  companyName: z.string().trim().optional(),
  companyLogoUrl: z.url().optional().or(z.literal("")),
  status: z.enum([STATUS.TO_APPLY, STATUS.APPLIED], {
    error: "Statut initial invalide",
  }),
});

export const updateJobStatusSchema = z.object({
  id: jobIdSchema,
  status: z.enum(
    [STATUS.TO_APPLY, STATUS.APPLIED, STATUS.INTERVIEW, STATUS.REJECTED],
    { error: "Statut invalide" }
  ),
});

export const updateJobDetailsSchema = z.object({
  id: jobIdSchema,
  title: z.string(),
  companyName: z.string(),
});

export const markFollowUpTodaySchema = z.object({
  id: jobIdSchema,
});

export const archiveJobSchema = z.object({
  id: jobIdSchema,
});

export const deleteJobSchema = z.object({
  id: jobIdSchema,
});

export const reorderJobsSchema = z.object({
  orderedIds: z.array(jobIdSchema).min(1, "Liste vide"),
});
