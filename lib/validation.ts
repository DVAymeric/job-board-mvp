import { z } from "zod";
import { normalizeUrl } from "@/lib/url";
import { CONTACT_ROLE, SALARY_TYPE, STATUS } from "@/lib/constants";

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
  descriptionText: z.string().trim().optional(),
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

export const updateJobNotesSchema = z.object({
  id: jobIdSchema,
  notes: z.string(),
});

export const markFollowUpTodaySchema = z.object({
  id: jobIdSchema,
});

export const archiveJobSchema = z.object({
  id: jobIdSchema,
});

export const unarchiveJobSchema = z.object({
  id: jobIdSchema,
});

export const deleteJobSchema = z.object({
  id: jobIdSchema,
});

export const reorderJobsSchema = z.object({
  orderedIds: z.array(jobIdSchema).min(1, "Liste vide"),
});

const tagNameSchema = z
  .string()
  .trim()
  .min(1, "Nom de tag invalide")
  .max(40, "Nom de tag trop long (40 caractères max)");

export const addTagToJobSchema = z.object({
  jobId: jobIdSchema,
  tagName: tagNameSchema,
});

export const removeTagFromJobSchema = z.object({
  jobId: jobIdSchema,
  tagId: jobIdSchema,
});

const contactRoleSchema = z.enum(
  [
    CONTACT_ROLE.RECRUITER,
    CONTACT_ROLE.MANAGER,
    CONTACT_ROLE.REFERRAL,
    CONTACT_ROLE.OTHER,
  ],
  { error: "Rôle invalide" }
);

const contactLinkedinUrlSchema = z
  .string()
  .trim()
  .url("URL LinkedIn invalide")
  .optional()
  .or(z.literal(""));

export const addContactSchema = z.object({
  jobId: jobIdSchema,
  name: z.string().trim().min(1, "Nom requis"),
  role: contactRoleSchema,
  linkedinUrl: contactLinkedinUrlSchema,
});

export const updateContactSchema = z.object({
  contactId: jobIdSchema,
  name: z.string().trim().min(1, "Nom requis"),
  role: contactRoleSchema,
  linkedinUrl: contactLinkedinUrlSchema,
});

export const deleteContactSchema = z.object({
  contactId: jobIdSchema,
});

export const updateJobSalarySchema = z.object({
  id: jobIdSchema,
  salaryAmount: z.number().int().positive().nullable(),
  salaryType: z.enum([SALARY_TYPE.ANNUAL, SALARY_TYPE.DAILY_RATE]).nullable(),
});

const optionalDocumentUrlSchema = z
  .string()
  .trim()
  .url("URL invalide")
  .optional()
  .or(z.literal(""));

export const updateJobDocumentsSchema = z.object({
  id: jobIdSchema,
  resumeUrl: optionalDocumentUrlSchema,
  coverLetterUrl: optionalDocumentUrlSchema,
});

export const updateJobInterviewDateSchema = z.object({
  id: jobIdSchema,
  interviewDate: z
    .string()
    .refine((value) => !Number.isNaN(new Date(value).getTime()), "Date invalide")
    .nullable(),
});

export const checkRepostSchema = z.object({
  id: jobIdSchema,
});

export const reactivateJobSchema = z.object({
  id: jobIdSchema,
  title: z.string().nullable(),
  companyName: z.string().nullable(),
  descriptionText: z.string().nullable(),
});
