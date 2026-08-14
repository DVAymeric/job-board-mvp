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
import {
  actionError,
  type ActionResult,
  firstIssueMessage,
  jobOwnerWhere,
  logActionError,
} from "./_shared";

/**
 * Met à jour le titre et l'entreprise d'une candidature.
 *
 * @param id Identifiant de la candidature.
 * @param title Nouveau titre — chaîne vide acceptée (efface le champ).
 * @param companyName Nouvelle entreprise — chaîne vide acceptée.
 * @errors `UNAUTHENTICATED`, `VALIDATION_ERROR`, `INTERNAL_ERROR`.
 */
export async function updateJobDetails(
  id: string,
  title: string,
  companyName: string
): Promise<ActionResult<null>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const parsed = updateJobDetailsSchema.safeParse({ id, title, companyName });
  if (!parsed.success) {
    return actionError(
      "VALIDATION_ERROR",
      firstIssueMessage(parsed.error, "Impossible de mettre à jour l'offre")
    );
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
    return actionError("INTERNAL_ERROR", "Impossible de mettre à jour l'offre");
  }
}

/**
 * Met à jour les notes libres d'une candidature.
 *
 * @param id Identifiant de la candidature.
 * @param notes Nouveau contenu — chaîne vide acceptée (efface le champ),
 * max `NOTES_MAX_LENGTH` caractères (lib/validation.ts).
 * @errors `UNAUTHENTICATED`, `VALIDATION_ERROR` (dépassement de longueur),
 * `INTERNAL_ERROR`.
 */
export async function updateJobNotes(
  id: string,
  notes: string
): Promise<ActionResult<null>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const parsed = updateJobNotesSchema.safeParse({ id, notes });
  if (!parsed.success) {
    return actionError(
      "VALIDATION_ERROR",
      firstIssueMessage(parsed.error, "Impossible d'enregistrer les notes")
    );
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
    return actionError("INTERNAL_ERROR", "Impossible d'enregistrer les notes");
  }
}

/**
 * Met à jour la rémunération d'une candidature.
 *
 * @param id Identifiant de la candidature.
 * @param salaryAmount Montant entier positif, ou `null` pour effacer.
 * @param salaryType `ANNUAL` | `DAILY_RATE`, ou `null` si `salaryAmount`
 * est `null`.
 * @errors `UNAUTHENTICATED`, `VALIDATION_ERROR` (montant ≤ 0, type
 * inconnu), `INTERNAL_ERROR`.
 */
export async function updateJobSalary(
  id: string,
  salaryAmount: number | null,
  salaryType: string | null
): Promise<ActionResult<null>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const parsed = updateJobSalarySchema.safeParse({ id, salaryAmount, salaryType });
  if (!parsed.success) {
    return actionError(
      "VALIDATION_ERROR",
      firstIssueMessage(parsed.error, "Impossible d'enregistrer le salaire")
    );
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
    return actionError("INTERNAL_ERROR", "Impossible d'enregistrer le salaire");
  }
}

/**
 * Met à jour les liens vers le CV et la lettre de motivation d'une
 * candidature. Ce sont des URLs stockées telles quelles — aucun fichier
 * n'est jamais uploadé sur le serveur.
 *
 * @param id Identifiant de la candidature.
 * @param resumeUrl URL du CV — chaîne vide acceptée (efface le champ).
 * @param coverLetterUrl URL de la lettre — chaîne vide acceptée.
 * @errors `UNAUTHENTICATED`, `VALIDATION_ERROR` (URL malformée),
 * `INTERNAL_ERROR`.
 */
export async function updateJobDocuments(
  id: string,
  resumeUrl: string,
  coverLetterUrl: string
): Promise<ActionResult<null>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const parsed = updateJobDocumentsSchema.safeParse({ id, resumeUrl, coverLetterUrl });
  if (!parsed.success) {
    return actionError(
      "VALIDATION_ERROR",
      firstIssueMessage(parsed.error, "Impossible d'enregistrer les documents")
    );
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
    return actionError("INTERNAL_ERROR", "Impossible d'enregistrer les documents");
  }
}

/**
 * Met à jour la date d'entretien d'une candidature.
 *
 * @param id Identifiant de la candidature.
 * @param interviewDate Chaîne de date ISO parsable, ou `null` pour effacer.
 * @errors `UNAUTHENTICATED`, `VALIDATION_ERROR` (date non parsable),
 * `INTERNAL_ERROR`.
 */
export async function updateJobInterviewDate(
  id: string,
  interviewDate: string | null
): Promise<ActionResult<null>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const parsed = updateJobInterviewDateSchema.safeParse({ id, interviewDate });
  if (!parsed.success) {
    return actionError(
      "VALIDATION_ERROR",
      firstIssueMessage(parsed.error, "Impossible d'enregistrer la date d'entretien")
    );
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
    return actionError("INTERNAL_ERROR", "Impossible d'enregistrer la date d'entretien");
  }
}
