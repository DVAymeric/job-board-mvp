"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { addTagToJobSchema, removeTagFromJobSchema } from "@/lib/validation";
import {
  actionError,
  type ActionResult,
  firstIssueMessage,
  jobOwnerWhere,
  logActionError,
} from "./_shared";

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
    return actionError(
      "VALIDATION_ERROR",
      firstIssueMessage(parsed.error, "Impossible d'ajouter ce tag")
    );
  }
  try {
    const job = await prisma.job.findUnique({
      where: jobOwnerWhere(parsed.data.jobId, auth.user.id),
    });
    if (!job) {
      return actionError("NOT_FOUND", "Offre introuvable");
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
  } catch (error) {
    logActionError("addTagToJob", error, { userId: auth.user.id });
    return actionError("INTERNAL_ERROR", "Impossible d'ajouter ce tag");
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
    return actionError(
      "VALIDATION_ERROR",
      firstIssueMessage(parsed.error, "Impossible de retirer ce tag")
    );
  }
  try {
    const job = await prisma.job.findUnique({
      where: jobOwnerWhere(parsed.data.jobId, auth.user.id),
    });
    if (!job) {
      return actionError("NOT_FOUND", "Offre introuvable");
    }

    await prisma.jobTag.delete({
      where: {
        jobId_tagId: { jobId: parsed.data.jobId, tagId: parsed.data.tagId },
      },
    });
    revalidatePath("/board");
    return { ok: true, data: null };
  } catch (error) {
    logActionError("removeTagFromJob", error, { userId: auth.user.id });
    return actionError("INTERNAL_ERROR", "Impossible de retirer ce tag");
  }
}
