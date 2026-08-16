"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/plan";
import { buildJobsCsv } from "@/lib/csv-export";
import {
  backupFileSchema,
  buildBackupFile,
  MAX_BACKUP_FILE_SIZE_BYTES,
} from "@/lib/backup";
import { actionError, type ActionResult, logActionError } from "./_shared";

/**
 * Génère un export CSV de toutes les candidatures de l'utilisateur courant.
 *
 * @returns `{ csv }` — contenu CSV complet, à télécharger côté client.
 * @errors `UNAUTHENTICATED`, `FORBIDDEN` (palier non entitled — cf.
 * lib/plan.ts, JOB-80 ; toujours autorisé aujourd'hui), `INTERNAL_ERROR`.
 */
export async function exportJobsCsv(): Promise<ActionResult<{ csv: string }>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  // Exemple d'usage du point d'extension palier payant (JOB-80) — toujours
  // vrai aujourd'hui (un seul plan, FREE, entitled à tout).
  if (!(await can(auth.user.id, "csv_export"))) {
    return actionError("FORBIDDEN", "Fonctionnalité non disponible sur votre offre");
  }

  try {
    const jobs = await prisma.job.findMany({
      where: { userId: auth.user.id },
      include: { tags: { include: { tag: true } } },
      orderBy: { createdAt: "asc" },
    });
    return { ok: true, data: { csv: buildJobsCsv(jobs) } };
  } catch (error) {
    logActionError("exportJobsCsv", error, { userId: auth.user.id });
    return actionError("INTERNAL_ERROR", "Impossible de générer l'export CSV");
  }
}

/**
 * Génère une sauvegarde JSON complète (candidatures, contacts, tags,
 * historique de statut) de l'utilisateur courant, ré-importable via
 * `importBackupJson`.
 *
 * @returns `{ json }` — contenu JSON complet, à télécharger côté client.
 * @errors `UNAUTHENTICATED`, `INTERNAL_ERROR`.
 */
export async function exportBackupJson(): Promise<ActionResult<{ json: string }>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  try {
    const [jobs, tags] = await Promise.all([
      prisma.job.findMany({
        where: { userId: auth.user.id },
        include: {
          tags: { include: { tag: true } },
          contacts: true,
          statusHistory: true,
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.tag.findMany({
        where: { userId: auth.user.id },
        orderBy: { name: "asc" },
      }),
    ]);
    const backup = buildBackupFile(jobs, tags);
    return { ok: true, data: { json: JSON.stringify(backup, null, 2) } };
  } catch (error) {
    logActionError("exportBackupJson", error, { userId: auth.user.id });
    return actionError("INTERNAL_ERROR", "Impossible de générer la sauvegarde");
  }
}

/**
 * Restaure une sauvegarde JSON (produite par `exportBackupJson`),
 * **remplaçant intégralement** les candidatures et tags actuels de
 * l'utilisateur (aucune fusion) dans une transaction unique.
 *
 * @param rawJson Contenu JSON brut du fichier de sauvegarde, max
 * `MAX_BACKUP_FILE_SIZE_BYTES` (lib/backup.ts).
 * @returns `{ importedJobs }` — nombre de candidatures restaurées.
 * @errors `UNAUTHENTICATED`, `VALIDATION_ERROR` (fichier trop volumineux,
 * JSON illisible, ou structure invalide), `INTERNAL_ERROR`.
 */
export async function importBackupJson(
  rawJson: string
): Promise<ActionResult<{ importedJobs: number }>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  if (rawJson.length > MAX_BACKUP_FILE_SIZE_BYTES) {
    return actionError(
      "VALIDATION_ERROR",
      `Fichier trop volumineux (${MAX_BACKUP_FILE_SIZE_BYTES / (1024 * 1024)} Mo max)`
    );
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawJson);
  } catch (error) {
    logActionError("importBackupJson.parse", error, { userId: auth.user.id });
    return actionError("VALIDATION_ERROR", "Fichier JSON illisible");
  }

  const parsed = backupFileSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", "Structure du fichier de sauvegarde invalide");
  }
  const backup = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.job.deleteMany({ where: { userId: auth.user.id } });
      await tx.tag.deleteMany({ where: { userId: auth.user.id } });

      if (backup.tags.length > 0) {
        await tx.tag.createMany({
          data: backup.tags.map((tag) => ({ ...tag, userId: auth.user.id })),
        });
      }

      for (const job of backup.jobs) {
        await tx.job.create({
          data: {
            id: job.id,
            userId: auth.user.id,
            url: job.url,
            title: job.title,
            companyName: job.companyName,
            companyLogoUrl: job.companyLogoUrl,
            notes: job.notes,
            status: job.status,
            archived: job.archived,
            order: job.order,
            lastFollowUp: job.lastFollowUp ? new Date(job.lastFollowUp) : null,
            salaryAmount: job.salaryAmount,
            salaryType: job.salaryType,
            resumeUrl: job.resumeUrl,
            coverLetterUrl: job.coverLetterUrl,
            interviewDate: job.interviewDate ? new Date(job.interviewDate) : null,
            descriptionText: job.descriptionText,
            createdAt: new Date(job.createdAt),
            updatedAt: new Date(job.updatedAt),
            contacts: {
              create: job.contacts.map((contact) => ({
                id: contact.id,
                userId: auth.user.id,
                name: contact.name,
                role: contact.role,
                linkedinUrl: contact.linkedinUrl,
                createdAt: new Date(contact.createdAt),
                updatedAt: new Date(contact.updatedAt),
              })),
            },
            statusHistory: {
              create: job.statusHistory.map((entry) => ({
                id: entry.id,
                status: entry.status,
                changedAt: new Date(entry.changedAt),
              })),
            },
            tags: {
              create: job.tagIds.map((tagId) => ({ tagId })),
            },
          },
        });
      }
    });

    revalidatePath("/board");
    revalidatePath("/archives");
    revalidatePath("/analytics");
    return { ok: true, data: { importedJobs: backup.jobs.length } };
  } catch (error) {
    logActionError("importBackupJson", error, { userId: auth.user.id });
    return actionError("INTERNAL_ERROR", "Impossible de restaurer la sauvegarde");
  }
}
