"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { JobStatus, STATUS } from "@/lib/constants";
import {
  archiveJobSchema,
  checkJobUrlSchema,
  createJobSchema,
  deleteJobSchema,
  markFollowUpTodaySchema,
  updateJobDetailsSchema,
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

export async function createJob(input: {
  url: string;
  titleCompany?: string;
  status: JobStatus;
}): Promise<ActionResult<{ id: string }>> {
  const parsed = createJobSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: firstIssueMessage(parsed.error, "Offre invalide"),
    };
  }
  const { url, titleCompany, status } = parsed.data;
  try {
    const job = await prisma.job.create({
      data: {
        url,
        title: titleCompany || null,
        status,
        lastFollowUp: status === STATUS.APPLIED ? new Date() : null,
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
  titleCompany: string
): Promise<ActionResult<null>> {
  const parsed = updateJobDetailsSchema.safeParse({ id, titleCompany });
  if (!parsed.success) {
    return {
      ok: false,
      error: firstIssueMessage(parsed.error, "Impossible de mettre à jour l'offre"),
    };
  }
  try {
    await prisma.job.update({
      where: { id: parsed.data.id },
      data: { title: parsed.data.titleCompany.trim() || null },
    });
    revalidatePath("/board");
    return { ok: true, data: null };
  } catch {
    return { ok: false, error: "Impossible de mettre à jour l'offre" };
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
    return { ok: true, data: null };
  } catch {
    return { ok: false, error: "Impossible d'archiver l'offre" };
  }
}
