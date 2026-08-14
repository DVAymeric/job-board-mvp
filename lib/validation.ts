import { z } from "zod";
import { normalizeUrl } from "@/lib/url";
import { CONTACT_ROLE, SALARY_TYPE, STATUS } from "@/lib/constants";

// Limites de longueur explicites (JOB-90) : évitent qu'un scraping de page
// énorme (descriptionText) ou un texte libre (notes) ne sature la base ou
// la requête. Réutilisées par lib/backup.ts pour le JSON de sauvegarde
// importé, qui doit accepter exactement les mêmes formes de contenu.
export const TITLE_MAX_LENGTH = 300;
export const COMPANY_NAME_MAX_LENGTH = 200;
export const NOTES_MAX_LENGTH = 10_000;
export const DESCRIPTION_MAX_LENGTH = 50_000;

const titleSchema = z
  .string()
  .trim()
  .max(TITLE_MAX_LENGTH, `Titre trop long (${TITLE_MAX_LENGTH} caractères max)`);
const companyNameSchema = z
  .string()
  .trim()
  .max(
    COMPANY_NAME_MAX_LENGTH,
    `Nom d'entreprise trop long (${COMPANY_NAME_MAX_LENGTH} caractères max)`
  );
const notesSchema = z
  .string()
  .trim()
  .max(NOTES_MAX_LENGTH, `Notes trop longues (${NOTES_MAX_LENGTH} caractères max)`);
const descriptionTextSchema = z
  .string()
  .trim()
  .max(
    DESCRIPTION_MAX_LENGTH,
    `Description trop longue (${DESCRIPTION_MAX_LENGTH} caractères max)`
  );

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
  title: titleSchema.optional(),
  companyName: companyNameSchema.optional(),
  companyLogoUrl: z.url().optional().or(z.literal("")),
  descriptionText: descriptionTextSchema.optional(),
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
  title: titleSchema,
  companyName: companyNameSchema,
});

export const updateJobNotesSchema = z.object({
  id: jobIdSchema,
  notes: notesSchema,
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
  title: titleSchema.nullable(),
  companyName: companyNameSchema.nullable(),
  descriptionText: descriptionTextSchema.nullable(),
});
