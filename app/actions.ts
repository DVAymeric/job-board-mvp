"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { JobStatus, STATUS } from "@/lib/constants";
import { extractJobMetadataFromHtml } from "@/lib/og-metadata";
import { buildJobsCsv } from "@/lib/csv-export";
import { backupFileSchema, buildBackupFile } from "@/lib/backup";
import {
  buildBrandfetchLogoUrl,
  buildClearbitLogoUrl,
  extractCompanyDomain,
} from "@/lib/company-logo";
import {
  addContactSchema,
  addTagToJobSchema,
  archiveJobSchema,
  checkJobUrlSchema,
  createJobSchema,
  deleteContactSchema,
  deleteJobSchema,
  markFollowUpTodaySchema,
  removeTagFromJobSchema,
  reorderJobsSchema,
  unarchiveJobSchema,
  updateContactSchema,
  updateJobDetailsSchema,
  updateJobDocumentsSchema,
  updateJobNotesSchema,
  updateJobSalarySchema,
  updateJobStatusSchema,
} from "@/lib/validation";

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

function firstIssueMessage(error: z.ZodError, fallback: string): string {
  return error.issues[0]?.message || fallback;
}

export async function checkJobUrl(
  rawUrl: string
): Promise<
  ActionResult<
    | { found: true; job: Awaited<ReturnType<typeof prisma.job.findUnique>> }
    | { found: false; normalizedUrl: string }
  >
> {
  const parsed = checkJobUrlSchema.safeParse(rawUrl);
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error, "URL invalide") };
  }
  const url = parsed.data;
  try {
    const job = await prisma.job.findUnique({ where: { url } });
    if (job) {
      return { ok: true, data: { found: true, job } };
    }
    return { ok: true, data: { found: false, normalizedUrl: url } };
  } catch {
    return { ok: false, error: "Impossible de vérifier cette offre" };
  }
}

const METADATA_FETCH_TIMEOUT_MS = 5000;

export async function fetchJobMetadata(
  rawUrl: string
): Promise<ActionResult<{ title: string | null; companyName: string | null }>> {
  const parsed = checkJobUrlSchema.safeParse(rawUrl);
  const empty = { title: null, companyName: null };
  if (!parsed.success) {
    return { ok: true, data: empty };
  }
  try {
    const response = await fetch(parsed.data, {
      signal: AbortSignal.timeout(METADATA_FETCH_TIMEOUT_MS),
      headers: { Accept: "text/html" },
    });
    if (!response.ok) {
      return { ok: true, data: empty };
    }
    const html = await response.text();
    return { ok: true, data: extractJobMetadataFromHtml(html) };
  } catch {
    return { ok: true, data: empty };
  }
}

const LOGO_FETCH_TIMEOUT_MS = 3000;

async function logoUrlResolves(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(LOGO_FETCH_TIMEOUT_MS),
    });
    return (
      response.ok &&
      (response.headers.get("content-type") ?? "").startsWith("image/")
    );
  } catch {
    return false;
  }
}

export async function fetchCompanyLogo(
  rawUrl: string
): Promise<ActionResult<{ logoUrl: string | null }>> {
  const empty = { logoUrl: null };
  const parsed = checkJobUrlSchema.safeParse(rawUrl);
  if (!parsed.success) {
    return { ok: true, data: empty };
  }
  const domain = extractCompanyDomain(parsed.data);
  if (!domain) {
    return { ok: true, data: empty };
  }

  const clearbitUrl = buildClearbitLogoUrl(domain);
  if (await logoUrlResolves(clearbitUrl)) {
    return { ok: true, data: { logoUrl: clearbitUrl } };
  }

  const brandfetchClientId = process.env.BRANDFETCH_CLIENT_ID;
  if (brandfetchClientId) {
    const brandfetchUrl = buildBrandfetchLogoUrl(domain, brandfetchClientId);
    if (await logoUrlResolves(brandfetchUrl)) {
      return { ok: true, data: { logoUrl: brandfetchUrl } };
    }
  }

  return { ok: true, data: empty };
}

export async function createJob(input: {
  url: string;
  title?: string;
  companyName?: string;
  companyLogoUrl?: string;
  status: JobStatus;
}): Promise<ActionResult<{ id: string }>> {
  const parsed = createJobSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: firstIssueMessage(parsed.error, "Offre invalide"),
    };
  }
  const { url, title, companyName, companyLogoUrl, status } = parsed.data;
  try {
    const job = await prisma.job.create({
      data: {
        url,
        title: title || null,
        companyName: companyName || null,
        companyLogoUrl: companyLogoUrl || null,
        status,
        lastFollowUp: status === STATUS.APPLIED ? new Date() : null,
        statusHistory: { create: { status } },
      },
    });
    revalidatePath("/board");
    return { ok: true, data: { id: job.id } };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { ok: false, error: "Cette offre a déjà été enregistrée" };
    }
    return { ok: false, error: "Impossible d'enregistrer cette offre" };
  }
}

export async function updateJobStatus(
  id: string,
  status: string
): Promise<ActionResult<null>> {
  const parsed = updateJobStatusSchema.safeParse({ id, status });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error, "Statut invalide") };
  }
  try {
    await prisma.job.update({
      where: { id: parsed.data.id },
      data: {
        status: parsed.data.status,
        ...(parsed.data.status === STATUS.APPLIED
          ? { lastFollowUp: new Date() }
          : {}),
        statusHistory: { create: { status: parsed.data.status } },
      },
    });
    revalidatePath("/board");
    return { ok: true, data: null };
  } catch {
    return { ok: false, error: "Impossible de mettre à jour le statut" };
  }
}

export async function markFollowUpToday(
  id: string
): Promise<ActionResult<null>> {
  const parsed = markFollowUpTodaySchema.safeParse({ id });
  if (!parsed.success) {
    return {
      ok: false,
      error: firstIssueMessage(parsed.error, "Impossible de mettre à jour la relance"),
    };
  }
  try {
    await prisma.job.update({
      where: { id: parsed.data.id },
      data: { lastFollowUp: new Date() },
    });
    revalidatePath("/board");
    return { ok: true, data: null };
  } catch {
    return { ok: false, error: "Impossible de mettre à jour la relance" };
  }
}

export async function updateJobDetails(
  id: string,
  title: string,
  companyName: string
): Promise<ActionResult<null>> {
  const parsed = updateJobDetailsSchema.safeParse({ id, title, companyName });
  if (!parsed.success) {
    return {
      ok: false,
      error: firstIssueMessage(parsed.error, "Impossible de mettre à jour l'offre"),
    };
  }
  try {
    await prisma.job.update({
      where: { id: parsed.data.id },
      data: {
        title: parsed.data.title.trim() || null,
        companyName: parsed.data.companyName.trim() || null,
      },
    });
    revalidatePath("/board");
    return { ok: true, data: null };
  } catch {
    return { ok: false, error: "Impossible de mettre à jour l'offre" };
  }
}

export async function updateJobNotes(
  id: string,
  notes: string
): Promise<ActionResult<null>> {
  const parsed = updateJobNotesSchema.safeParse({ id, notes });
  if (!parsed.success) {
    return {
      ok: false,
      error: firstIssueMessage(parsed.error, "Impossible d'enregistrer les notes"),
    };
  }
  try {
    await prisma.job.update({
      where: { id: parsed.data.id },
      data: { notes: parsed.data.notes.trim() || null },
    });
    revalidatePath("/board");
    return { ok: true, data: null };
  } catch {
    return { ok: false, error: "Impossible d'enregistrer les notes" };
  }
}

export async function updateJobSalary(
  id: string,
  salaryAmount: number | null,
  salaryType: string | null
): Promise<ActionResult<null>> {
  const parsed = updateJobSalarySchema.safeParse({ id, salaryAmount, salaryType });
  if (!parsed.success) {
    return {
      ok: false,
      error: firstIssueMessage(parsed.error, "Impossible d'enregistrer le salaire"),
    };
  }
  try {
    await prisma.job.update({
      where: { id: parsed.data.id },
      data: {
        salaryAmount: parsed.data.salaryAmount,
        salaryType: parsed.data.salaryType,
      },
    });
    revalidatePath("/board");
    revalidatePath("/comparateur");
    return { ok: true, data: null };
  } catch {
    return { ok: false, error: "Impossible d'enregistrer le salaire" };
  }
}

export async function updateJobDocuments(
  id: string,
  resumeUrl: string,
  coverLetterUrl: string
): Promise<ActionResult<null>> {
  const parsed = updateJobDocumentsSchema.safeParse({ id, resumeUrl, coverLetterUrl });
  if (!parsed.success) {
    return {
      ok: false,
      error: firstIssueMessage(parsed.error, "Impossible d'enregistrer les documents"),
    };
  }
  try {
    await prisma.job.update({
      where: { id: parsed.data.id },
      data: {
        resumeUrl: parsed.data.resumeUrl || null,
        coverLetterUrl: parsed.data.coverLetterUrl || null,
      },
    });
    revalidatePath("/board");
    return { ok: true, data: null };
  } catch {
    return { ok: false, error: "Impossible d'enregistrer les documents" };
  }
}

export async function deleteJob(id: string): Promise<ActionResult<null>> {
  const parsed = deleteJobSchema.safeParse({ id });
  if (!parsed.success) {
    return {
      ok: false,
      error: firstIssueMessage(parsed.error, "Impossible de supprimer l'offre"),
    };
  }
  try {
    await prisma.job.delete({ where: { id: parsed.data.id } });
    revalidatePath("/board");
    revalidatePath("/archives");
    return { ok: true, data: null };
  } catch {
    return { ok: false, error: "Impossible de supprimer l'offre" };
  }
}

export async function archiveJob(id: string): Promise<ActionResult<null>> {
  const parsed = archiveJobSchema.safeParse({ id });
  if (!parsed.success) {
    return {
      ok: false,
      error: firstIssueMessage(parsed.error, "Impossible d'archiver l'offre"),
    };
  }
  try {
    await prisma.job.update({
      where: { id: parsed.data.id },
      data: { archived: true },
    });
    revalidatePath("/board");
    revalidatePath("/archives");
    return { ok: true, data: null };
  } catch {
    return { ok: false, error: "Impossible d'archiver l'offre" };
  }
}

export async function unarchiveJob(id: string): Promise<ActionResult<null>> {
  const parsed = unarchiveJobSchema.safeParse({ id });
  if (!parsed.success) {
    return {
      ok: false,
      error: firstIssueMessage(parsed.error, "Impossible de désarchiver l'offre"),
    };
  }
  try {
    await prisma.job.update({
      where: { id: parsed.data.id },
      data: { archived: false },
    });
    revalidatePath("/board");
    revalidatePath("/archives");
    return { ok: true, data: null };
  } catch {
    return { ok: false, error: "Impossible de désarchiver l'offre" };
  }
}

export async function reorderJobs(
  orderedIds: string[]
): Promise<ActionResult<null>> {
  const parsed = reorderJobsSchema.safeParse({ orderedIds });
  if (!parsed.success) {
    return {
      ok: false,
      error: firstIssueMessage(
        parsed.error,
        "Impossible de réordonner les candidatures"
      ),
    };
  }
  try {
    await prisma.$transaction(
      parsed.data.orderedIds.map((id, index) =>
        prisma.job.update({ where: { id }, data: { order: index } })
      )
    );
    revalidatePath("/board");
    return { ok: true, data: null };
  } catch {
    return { ok: false, error: "Impossible de réordonner les candidatures" };
  }
}

export async function addTagToJob(
  jobId: string,
  tagName: string
): Promise<ActionResult<{ tag: { id: string; name: string } }>> {
  const parsed = addTagToJobSchema.safeParse({ jobId, tagName });
  if (!parsed.success) {
    return {
      ok: false,
      error: firstIssueMessage(parsed.error, "Impossible d'ajouter ce tag"),
    };
  }
  try {
    const tag = await prisma.tag.upsert({
      where: { name: parsed.data.tagName },
      create: { name: parsed.data.tagName },
      update: {},
    });
    await prisma.jobTag.upsert({
      where: {
        jobId_tagId: { jobId: parsed.data.jobId, tagId: tag.id },
      },
      create: { jobId: parsed.data.jobId, tagId: tag.id },
      update: {},
    });
    revalidatePath("/board");
    return { ok: true, data: { tag: { id: tag.id, name: tag.name } } };
  } catch {
    return { ok: false, error: "Impossible d'ajouter ce tag" };
  }
}

export async function removeTagFromJob(
  jobId: string,
  tagId: string
): Promise<ActionResult<null>> {
  const parsed = removeTagFromJobSchema.safeParse({ jobId, tagId });
  if (!parsed.success) {
    return {
      ok: false,
      error: firstIssueMessage(parsed.error, "Impossible de retirer ce tag"),
    };
  }
  try {
    await prisma.jobTag.delete({
      where: {
        jobId_tagId: { jobId: parsed.data.jobId, tagId: parsed.data.tagId },
      },
    });
    revalidatePath("/board");
    return { ok: true, data: null };
  } catch {
    return { ok: false, error: "Impossible de retirer ce tag" };
  }
}

export async function addContact(
  jobId: string,
  input: { name: string; role: string; linkedinUrl?: string }
): Promise<
  ActionResult<{
    contact: {
      id: string;
      name: string;
      role: string | null;
      linkedinUrl: string | null;
    };
  }>
> {
  const parsed = addContactSchema.safeParse({ jobId, ...input });
  if (!parsed.success) {
    return {
      ok: false,
      error: firstIssueMessage(parsed.error, "Impossible d'ajouter ce contact"),
    };
  }
  try {
    const contact = await prisma.contact.create({
      data: {
        jobId: parsed.data.jobId,
        name: parsed.data.name,
        role: parsed.data.role,
        linkedinUrl: parsed.data.linkedinUrl || null,
      },
    });
    revalidatePath("/board");
    return { ok: true, data: { contact } };
  } catch {
    return { ok: false, error: "Impossible d'ajouter ce contact" };
  }
}

export async function updateContact(
  contactId: string,
  input: { name: string; role: string; linkedinUrl?: string }
): Promise<ActionResult<null>> {
  const parsed = updateContactSchema.safeParse({ contactId, ...input });
  if (!parsed.success) {
    return {
      ok: false,
      error: firstIssueMessage(parsed.error, "Impossible de modifier ce contact"),
    };
  }
  try {
    await prisma.contact.update({
      where: { id: parsed.data.contactId },
      data: {
        name: parsed.data.name,
        role: parsed.data.role,
        linkedinUrl: parsed.data.linkedinUrl || null,
      },
    });
    revalidatePath("/board");
    return { ok: true, data: null };
  } catch {
    return { ok: false, error: "Impossible de modifier ce contact" };
  }
}

export async function deleteContact(
  contactId: string
): Promise<ActionResult<null>> {
  const parsed = deleteContactSchema.safeParse({ contactId });
  if (!parsed.success) {
    return {
      ok: false,
      error: firstIssueMessage(parsed.error, "Impossible de supprimer ce contact"),
    };
  }
  try {
    await prisma.contact.delete({ where: { id: parsed.data.contactId } });
    revalidatePath("/board");
    return { ok: true, data: null };
  } catch {
    return { ok: false, error: "Impossible de supprimer ce contact" };
  }
}

export async function exportJobsCsv(): Promise<ActionResult<{ csv: string }>> {
  try {
    const jobs = await prisma.job.findMany({
      include: { tags: { include: { tag: true } } },
      orderBy: { createdAt: "asc" },
    });
    return { ok: true, data: { csv: buildJobsCsv(jobs) } };
  } catch {
    return { ok: false, error: "Impossible de générer l'export CSV" };
  }
}

export async function exportBackupJson(): Promise<ActionResult<{ json: string }>> {
  try {
    const [jobs, tags] = await Promise.all([
      prisma.job.findMany({
        include: {
          tags: { include: { tag: true } },
          contacts: true,
          statusHistory: true,
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.tag.findMany({ orderBy: { name: "asc" } }),
    ]);
    const backup = buildBackupFile(jobs, tags);
    return { ok: true, data: { json: JSON.stringify(backup, null, 2) } };
  } catch {
    return { ok: false, error: "Impossible de générer la sauvegarde" };
  }
}

export async function importBackupJson(
  rawJson: string
): Promise<ActionResult<{ importedJobs: number }>> {
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawJson);
  } catch {
    return { ok: false, error: "Fichier JSON illisible" };
  }

  const parsed = backupFileSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Structure du fichier de sauvegarde invalide",
    };
  }
  const backup = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.job.deleteMany({});
      await tx.tag.deleteMany({});

      if (backup.tags.length > 0) {
        await tx.tag.createMany({ data: backup.tags });
      }

      for (const job of backup.jobs) {
        await tx.job.create({
          data: {
            id: job.id,
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
            createdAt: new Date(job.createdAt),
            updatedAt: new Date(job.updatedAt),
            contacts: {
              create: job.contacts.map((contact) => ({
                id: contact.id,
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
  } catch {
    return { ok: false, error: "Impossible de restaurer la sauvegarde" };
  }
}
