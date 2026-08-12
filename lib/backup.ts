import { z } from "zod";
import type { JobWithRelations } from "@/lib/types";

export const BACKUP_SCHEMA_VERSION = 1;

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
  status: z.string(),
  changedAt: z.string(),
});

const jobBackupSchema = z.object({
  id: z.string().min(1),
  url: z.string(),
  title: z.string().nullable(),
  companyName: z.string().nullable(),
  companyLogoUrl: z.string().nullable(),
  notes: z.string().nullable(),
  status: z.string(),
  archived: z.boolean(),
  order: z.number(),
  lastFollowUp: z.string().nullable(),
  salaryAmount: z.number().nullable(),
  salaryType: z.string().nullable(),
  resumeUrl: z.string().nullable(),
  coverLetterUrl: z.string().nullable(),
  interviewDate: z.string().nullable(),
  descriptionText: z.string().nullable(),
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
