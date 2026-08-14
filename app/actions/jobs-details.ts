"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import {
  updateJobDetailsSchema,
  updateJobDocumentsSchema,
  updateJobInterviewDateSchema,
  updateJobNotesSchema,
  updateJobSalarySchema,
} from "@/lib/validation";
import { type ActionResult, firstIssueMessage, jobOwnerWhere, logActionError } from "./_shared";

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
  } catch (error) {
    logActionError("updateJobDetails", error, { userId: auth.user.id });
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
  } catch (error) {
    logActionError("updateJobNotes", error, { userId: auth.user.id });
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
  } catch (error) {
    logActionError("updateJobSalary", error, { userId: auth.user.id });
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
  } catch (error) {
    logActionError("updateJobDocuments", error, { userId: auth.user.id });
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
  } catch (error) {
    logActionError("updateJobInterviewDate", error, { userId: auth.user.id });
    return { ok: false, error: "Impossible d'enregistrer la date d'entretien" };
  }
}
