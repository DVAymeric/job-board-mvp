"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { STATUS } from "@/lib/constants";
import {
  archiveJobSchema,
  deleteJobSchema,
  markFollowUpTodaySchema,
  reorderJobsSchema,
  unarchiveJobSchema,
  updateJobStatusSchema,
} from "@/lib/validation";
import { type ActionResult, firstIssueMessage, jobOwnerWhere, logActionError } from "./_shared";

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
  } catch (error) {
    logActionError("updateJobStatus", error, { userId: auth.user.id });
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
  } catch (error) {
    logActionError("markFollowUpToday", error, { userId: auth.user.id });
    return { ok: false, error: "Impossible de mettre à jour la relance" };
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
  } catch (error) {
    logActionError("deleteJob", error, { userId: auth.user.id });
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
  } catch (error) {
    logActionError("archiveJob", error, { userId: auth.user.id });
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
  } catch (error) {
    logActionError("unarchiveJob", error, { userId: auth.user.id });
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
  } catch (error) {
    logActionError("reorderJobs", error, { userId: auth.user.id });
    return { ok: false, error: "Impossible de réordonner les candidatures" };
  }
}
