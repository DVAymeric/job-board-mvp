import { z } from "zod";
import { SALARY_TYPE, STATUS } from "@/lib/constants";
import {
  COMPANY_NAME_MAX_LENGTH,
  DESCRIPTION_MAX_LENGTH,
  NOTES_MAX_LENGTH,
  TITLE_MAX_LENGTH,
} from "@/lib/validation";
import type { JobWithRelations } from "@/lib/types";

export const BACKUP_SCHEMA_VERSION = 1;

// Taille max du fichier de sauvegarde importé (JOB-90), vérifiée côté
// serveur dans importBackupJson avant même le JSON.parse — indépendamment
// des limites par champ ci-dessous, qui bornent chaque valeur individuelle
// une fois le fichier parsé.
export const MAX_BACKUP_FILE_SIZE_BYTES = 4 * 1024 * 1024;

const statusBackupSchema = z.enum([
  STATUS.TO_APPLY,
  STATUS.APPLIED,
  STATUS.INTERVIEW,
  STATUS.REJECTED,
]);

const salaryTypeBackupSchema = z.enum([
  SALARY_TYPE.ANNUAL,
  SALARY_TYPE.DAILY_RATE,
]);

const contactBackupSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  role: z.string().nullable(),
  linkedinUrl: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const statusHistoryBackupSchema = z.object({
  id: z.string().min(1),
  status: statusBackupSchema,
  changedAt: z.string(),
});

const jobBackupSchema = z.object({
  id: z.string().min(1),
  url: z.string(),
  title: z.string().max(TITLE_MAX_LENGTH).nullable(),
  companyName: z.string().max(COMPANY_NAME_MAX_LENGTH).nullable(),
  companyLogoUrl: z.string().nullable(),
  notes: z.string().max(NOTES_MAX_LENGTH).nullable(),
  status: statusBackupSchema,
  archived: z.boolean(),
  order: z.number(),
  lastFollowUp: z.string().nullable(),
  salaryAmount: z.number().nullable(),
  salaryType: salaryTypeBackupSchema.nullable(),
  resumeUrl: z.string().nullable(),
  coverLetterUrl: z.string().nullable(),
  interviewDate: z.string().nullable(),
  descriptionText: z.string().max(DESCRIPTION_MAX_LENGTH).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  tagIds: z.array(z.string()),
  contacts: z.array(contactBackupSchema),
  statusHistory: z.array(statusHistoryBackupSchema),
});

const tagBackupSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
});

export const backupFileSchema = z.object({
  schemaVersion: z.number(),
  exportedAt: z.string(),
  tags: z.array(tagBackupSchema),
  jobs: z.array(jobBackupSchema),
});

export type BackupFile = z.infer<typeof backupFileSchema>;
export type BackupJob = z.infer<typeof jobBackupSchema>;
export type BackupTag = z.infer<typeof tagBackupSchema>;

export function buildBackupFile(
  jobs: JobWithRelations[],
  tags: BackupTag[]
): BackupFile {
  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    tags,
    jobs: jobs.map((job) => ({
      id: job.id,
      url: job.url,
      title: job.title,
      companyName: job.companyName,
      companyLogoUrl: job.companyLogoUrl,
      notes: job.notes,
      status: job.status,
      archived: job.archived,
      order: job.order,
      lastFollowUp: job.lastFollowUp ? job.lastFollowUp.toISOString() : null,
      salaryAmount: job.salaryAmount,
      salaryType: job.salaryType,
      resumeUrl: job.resumeUrl,
      coverLetterUrl: job.coverLetterUrl,
      interviewDate: job.interviewDate ? job.interviewDate.toISOString() : null,
      descriptionText: job.descriptionText,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
      tagIds: job.tags.map((jt) => jt.tagId),
      contacts: job.contacts.map((contact) => ({
        id: contact.id,
        name: contact.name,
        role: contact.role,
        linkedinUrl: contact.linkedinUrl,
        createdAt: contact.createdAt.toISOString(),
        updatedAt: contact.updatedAt.toISOString(),
      })),
      statusHistory: job.statusHistory.map((entry) => ({
        id: entry.id,
        status: entry.status,
        changedAt: entry.changedAt.toISOString(),
      })),
    })),
  };
}
