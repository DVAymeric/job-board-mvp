"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { JobStatus, STATUS } from "@/lib/constants";
import { extractJobMetadataFromHtml } from "@/lib/og-metadata";
import { safeFetch } from "@/lib/safe-fetch";
import { type DiffLine, diffLines, hasContentChanged } from "@/lib/repost-diff";
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
  checkRepostSchema,
  createJobSchema,
  deleteContactSchema,
  deleteJobSchema,
  markFollowUpTodaySchema,
  reactivateJobSchema,
  removeTagFromJobSchema,
  reorderJobsSchema,
  unarchiveJobSchema,
  updateContactSchema,
  updateJobDetailsSchema,
  updateJobDocumentsSchema,
  updateJobInterviewDateSchema,
  updateJobNotesSchema,
  updateJobSalarySchema,
  updateJobStatusSchema,
} from "@/lib/validation";

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

function firstIssueMessage(error: z.ZodError, fallback: string): string {
  return error.issues[0]?.message || fallback;
}

/**
 * Scopes a Job lookup/mutation to its owner: `update`/`delete` throw
 * RecordNotFound (caught by the surrounding try/catch) if `id` exists but
 * belongs to a different user, instead of leaking or mutating cross-tenant.
 */
function jobOwnerWhere(id: string, userId: string) {
  return { id_userId: { id, userId } };
}

function contactOwnerWhere(id: string, userId: string) {
  return { id_userId: { id, userId } };
}

export async function checkJobUrl(
  rawUrl: string
): Promise<
  ActionResult<
    | { found: true; job: Awaited<ReturnType<typeof prisma.job.findUnique>> }
    | { found: false; normalizedUrl: string }
  >
> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const parsed = checkJobUrlSchema.safeParse(rawUrl);
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error, "URL invalide") };
  }
  const url = parsed.data;
  try {
    const job = await prisma.job.findUnique({
      where: { userId_url: { userId: auth.user.id, url } },
    });
    if (job) {
      return { ok: true, data: { found: true, job } };
    }
    return { ok: true, data: { found: false, normalizedUrl: url } };
  } catch {
    return { ok: false, error: "Impossible de vérifier cette offre" };
  }
}

const METADATA_FETCH_TIMEOUT_MS = 5000;

export async function fetchJobMetadata(rawUrl: string): Promise<
  ActionResult<{
    title: string | null;
    companyName: string | null;
    descriptionText: string | null;
  }>
> {
  const parsed = checkJobUrlSchema.safeParse(rawUrl);
  const empty = { title: null, companyName: null, descriptionText: null };
  if (!parsed.success) {
    return { ok: true, data: empty };
  }
  try {
    const response = await safeFetch(parsed.data, {
      signal: AbortSignal.timeout(METADATA_FETCH_TIMEOUT_MS),
      headers: { Accept: "text/html" },
    });
    if (!response || !response.ok) {
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
    const response = await safeFetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(LOGO_FETCH_TIMEOUT_MS),
    });
    return (
      !!response &&
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
  descriptionText?: string;
  status: JobStatus;
}): Promise<ActionResult<{ id: string }>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const parsed = createJobSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: firstIssueMessage(parsed.error, "Offre invalide"),
    };
  }
  const { url, title, companyName, companyLogoUrl, descriptionText, status } =
    parsed.data;
  try {
    const job = await prisma.job.create({
      data: {
        userId: auth.user.id,
        url,
        title: title || null,
        companyName: companyName || null,
        companyLogoUrl: companyLogoUrl || null,
        descriptionText: descriptionText || null,
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

export async function checkRepost(id: string): Promise<
  ActionResult<{
    changed: boolean;
    diff: DiffLine[];
    fresh: {
      title: string | null;
      companyName: string | null;
      descriptionText: string | null;
    };
  }>
> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const parsed = checkRepostSchema.safeParse({ id });
  if (!parsed.success) {
    return {
      ok: false,
      error: firstIssueMessage(parsed.error, "Identifiant invalide"),
    };
  }
  let job;
  try {
    job = await prisma.job.findUnique({
      where: jobOwnerWhere(parsed.data.id, auth.user.id),
    });
  } catch {
    return { ok: false, error: "Impossible de vérifier cette offre" };
  }
  if (!job) {
    return { ok: false, error: "Offre introuvable" };
  }
  if (!job.archived) {
    return { ok: false, error: "Cette offre est déjà active" };
  }

  const metadata = await fetchJobMetadata(job.url);
  const fresh = metadata.ok
    ? metadata.data
    : { title: null, companyName: null, descriptionText: null };

  return {
    ok: true,
    data: {
      changed: hasContentChanged(job.descriptionText, fresh.descriptionText),
      diff: diffLines(job.descriptionText, fresh.descriptionText),
      fresh,
    },
  };
}

export async function reactivateJobWithContent(input: {
  id: string;
  title: string | null;
  companyName: string | null;
  descriptionText: string | null;
}): Promise<ActionResult<null>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const parsed = reactivateJobSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: firstIssueMessage(parsed.error, "Impossible de réactiver l'offre"),
    };
  }
  const { id, title, companyName, descriptionText } = parsed.data;
  try {
    await prisma.job.update({
      where: jobOwnerWhere(id, auth.user.id),
      data: {
        title,
        companyName,
        descriptionText,
        archived: false,
        status: STATUS.TO_APPLY,
        lastFollowUp: null,
        statusHistory: { create: { status: STATUS.TO_APPLY } },
      },
    });
    revalidatePath("/board");
    revalidatePath("/archives");
    return { ok: true, data: null };
  } catch {
    return { ok: false, error: "Impossible de réactiver l'offre" };
  }
}

export async function updateJobStatus(
  id: string,
  status: string
): Promise<ActionResult<null>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const parsed = updateJobStatusSchema.safeParse({ id, status });
  if (!parsed.success) {
    return { ok: false, error: firstIssueMessage(parsed.error, "Statut invalide") };
  }
  try {
    await prisma.job.update({
      where: jobOwnerWhere(parsed.data.id, auth.user.id),
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
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const parsed = markFollowUpTodaySchema.safeParse({ id });
  if (!parsed.success) {
    return {
      ok: false,
      error: firstIssueMessage(parsed.error, "Impossible de mettre à jour la relance"),
    };
  }
  try {
    await prisma.job.update({
      where: jobOwnerWhere(parsed.data.id, auth.user.id),
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
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const parsed = updateJobDetailsSchema.safeParse({ id, title, companyName });
  if (!parsed.success) {
    return {
      ok: false,
      error: firstIssueMessage(parsed.error, "Impossible de mettre à jour l'offre"),
    };
  }
  try {
    await prisma.job.update({
      where: jobOwnerWhere(parsed.data.id, auth.user.id),
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
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const parsed = updateJobNotesSchema.safeParse({ id, notes });
  if (!parsed.success) {
    return {
      ok: false,
      error: firstIssueMessage(parsed.error, "Impossible d'enregistrer les notes"),
    };
  }
  try {
    await prisma.job.update({
      where: jobOwnerWhere(parsed.data.id, auth.user.id),
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
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const parsed = updateJobSalarySchema.safeParse({ id, salaryAmount, salaryType });
  if (!parsed.success) {
    return {
      ok: false,
      error: firstIssueMessage(parsed.error, "Impossible d'enregistrer le salaire"),
    };
  }
  try {
    await prisma.job.update({
      where: jobOwnerWhere(parsed.data.id, auth.user.id),
      data: {
        salaryAmount: parsed.data.salaryAmount,
        salaryType: parsed.data.salaryType,
      },
    });
    revalidatePath("/board");
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
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const parsed = updateJobDocumentsSchema.safeParse({ id, resumeUrl, coverLetterUrl });
  if (!parsed.success) {
    return {
      ok: false,
      error: firstIssueMessage(parsed.error, "Impossible d'enregistrer les documents"),
    };
  }
  try {
    await prisma.job.update({
      where: jobOwnerWhere(parsed.data.id, auth.user.id),
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

export async function updateJobInterviewDate(
  id: string,
  interviewDate: string | null
): Promise<ActionResult<null>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const parsed = updateJobInterviewDateSchema.safeParse({ id, interviewDate });
  if (!parsed.success) {
    return {
      ok: false,
      error: firstIssueMessage(parsed.error, "Impossible d'enregistrer la date d'entretien"),
    };
  }
  try {
    await prisma.job.update({
      where: jobOwnerWhere(parsed.data.id, auth.user.id),
      data: {
        interviewDate: parsed.data.interviewDate
          ? new Date(parsed.data.interviewDate)
          : null,
      },
    });
    revalidatePath("/board");
    return { ok: true, data: null };
  } catch {
    return { ok: false, error: "Impossible d'enregistrer la date d'entretien" };
  }
}

export async function deleteJob(id: string): Promise<ActionResult<null>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const parsed = deleteJobSchema.safeParse({ id });
  if (!parsed.success) {
    return {
      ok: false,
      error: firstIssueMessage(parsed.error, "Impossible de supprimer l'offre"),
    };
  }
  try {
    await prisma.job.delete({ where: jobOwnerWhere(parsed.data.id, auth.user.id) });
    revalidatePath("/board");
    revalidatePath("/archives");
    return { ok: true, data: null };
  } catch {
    return { ok: false, error: "Impossible de supprimer l'offre" };
  }
}

export async function archiveJob(id: string): Promise<ActionResult<null>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const parsed = archiveJobSchema.safeParse({ id });
  if (!parsed.success) {
    return {
      ok: false,
      error: firstIssueMessage(parsed.error, "Impossible d'archiver l'offre"),
    };
  }
  try {
    await prisma.job.update({
      where: jobOwnerWhere(parsed.data.id, auth.user.id),
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
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const parsed = unarchiveJobSchema.safeParse({ id });
  if (!parsed.success) {
    return {
      ok: false,
      error: firstIssueMessage(parsed.error, "Impossible de désarchiver l'offre"),
    };
  }
  try {
    await prisma.job.update({
      where: jobOwnerWhere(parsed.data.id, auth.user.id),
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
  const auth = await requireUser();
  if (!auth.ok) return auth;

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
        prisma.job.update({
          where: jobOwnerWhere(id, auth.user.id),
          data: { order: index },
        })
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
): Promise<
  ActionResult<{ tag: { id: string; userId: string; name: string } }>
> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const parsed = addTagToJobSchema.safeParse({ jobId, tagName });
  if (!parsed.success) {
    return {
      ok: false,
      error: firstIssueMessage(parsed.error, "Impossible d'ajouter ce tag"),
    };
  }
  try {
    const job = await prisma.job.findUnique({
      where: jobOwnerWhere(parsed.data.jobId, auth.user.id),
    });
    if (!job) {
      return { ok: false, error: "Offre introuvable" };
    }

    const tag = await prisma.tag.upsert({
      where: { userId_name: { userId: auth.user.id, name: parsed.data.tagName } },
      create: { userId: auth.user.id, name: parsed.data.tagName },
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
    return {
      ok: true,
      data: { tag: { id: tag.id, userId: tag.userId, name: tag.name } },
    };
  } catch {
    return { ok: false, error: "Impossible d'ajouter ce tag" };
  }
}

export async function removeTagFromJob(
  jobId: string,
  tagId: string
): Promise<ActionResult<null>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const parsed = removeTagFromJobSchema.safeParse({ jobId, tagId });
  if (!parsed.success) {
    return {
      ok: false,
      error: firstIssueMessage(parsed.error, "Impossible de retirer ce tag"),
    };
  }
  try {
    const job = await prisma.job.findUnique({
      where: jobOwnerWhere(parsed.data.jobId, auth.user.id),
    });
    if (!job) {
      return { ok: false, error: "Offre introuvable" };
    }

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
      userId: string;
      name: string;
      role: string | null;
      linkedinUrl: string | null;
    };
  }>
> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const parsed = addContactSchema.safeParse({ jobId, ...input });
  if (!parsed.success) {
    return {
      ok: false,
      error: firstIssueMessage(parsed.error, "Impossible d'ajouter ce contact"),
    };
  }
  try {
    const job = await prisma.job.findUnique({
      where: jobOwnerWhere(parsed.data.jobId, auth.user.id),
    });
    if (!job) {
      return { ok: false, error: "Offre introuvable" };
    }

    const contact = await prisma.contact.create({
      data: {
        jobId: parsed.data.jobId,
        userId: auth.user.id,
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
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const parsed = updateContactSchema.safeParse({ contactId, ...input });
  if (!parsed.success) {
    return {
      ok: false,
      error: firstIssueMessage(parsed.error, "Impossible de modifier ce contact"),
    };
  }
  try {
    await prisma.contact.update({
      where: contactOwnerWhere(parsed.data.contactId, auth.user.id),
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
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const parsed = deleteContactSchema.safeParse({ contactId });
  if (!parsed.success) {
    return {
      ok: false,
      error: firstIssueMessage(parsed.error, "Impossible de supprimer ce contact"),
    };
  }
  try {
    await prisma.contact.delete({
      where: contactOwnerWhere(parsed.data.contactId, auth.user.id),
    });
    revalidatePath("/board");
    return { ok: true, data: null };
  } catch {
    return { ok: false, error: "Impossible de supprimer ce contact" };
  }
}

export async function exportJobsCsv(): Promise<ActionResult<{ csv: string }>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

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
  const auth = await requireUser();
  if (!auth.ok) return auth;

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
  const auth = await requireUser();
  if (!auth.ok) return auth;

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
  } catch {
    return { ok: false, error: "Impossible de restaurer la sauvegarde" };
  }
}
