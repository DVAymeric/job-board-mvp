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
import {
  actionError,
  type ActionResult,
  firstIssueMessage,
  jobOwnerWhere,
  logActionError,
} from "./_shared";

/**
 * Change le statut d'une candidature (drag & drop entre colonnes du board,
 * ou changement manuel). Marque `lastFollowUp` à maintenant quand le
 * nouveau statut est `APPLIED`, et ajoute une entrée à `statusHistory`.
 *
 * @param id Identifiant de la candidature.
 * @param status Nouveau statut (`TO_APPLY` | `APPLIED` | `INTERVIEW` |
 * `REJECTED`).
 * @errors `UNAUTHENTICATED`, `VALIDATION_ERROR`, `INTERNAL_ERROR`.
 */
export async function updateJobStatus(
  id: string,
  status: string
): Promise<ActionResult<null>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const parsed = updateJobStatusSchema.safeParse({ id, status });
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", firstIssueMessage(parsed.error, "Statut invalide"));
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
    return actionError("INTERNAL_ERROR", "Impossible de mettre à jour le statut");
  }
}

/**
 * Marque une candidature comme relancée aujourd'hui — repousse son badge
 * "Relancer ?" de `FOLLOW_UP_DAYS` jours (lib/constants.ts).
 *
 * @param id Identifiant de la candidature.
 * @errors `UNAUTHENTICATED`, `VALIDATION_ERROR`, `INTERNAL_ERROR`.
 */
export async function markFollowUpToday(
  id: string
): Promise<ActionResult<null>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const parsed = markFollowUpTodaySchema.safeParse({ id });
  if (!parsed.success) {
    return actionError(
      "VALIDATION_ERROR",
      firstIssueMessage(parsed.error, "Impossible de mettre à jour la relance")
    );
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
    return actionError("INTERNAL_ERROR", "Impossible de mettre à jour la relance");
  }
}

/**
 * Supprime définitivement une candidature (et, en cascade au niveau du
 * schéma, ses contacts/tags/historique liés). Irréversible — l'appelant
 * doit passer par une confirmation utilisateur avant d'invoquer ceci.
 *
 * @param id Identifiant de la candidature.
 * @errors `UNAUTHENTICATED`, `VALIDATION_ERROR`, `INTERNAL_ERROR`.
 */
export async function deleteJob(id: string): Promise<ActionResult<null>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const parsed = deleteJobSchema.safeParse({ id });
  if (!parsed.success) {
    return actionError(
      "VALIDATION_ERROR",
      firstIssueMessage(parsed.error, "Impossible de supprimer l'offre")
    );
  }
  try {
    await prisma.job.delete({ where: jobOwnerWhere(parsed.data.id, auth.user.id) });
    revalidatePath("/board");
    revalidatePath("/archives");
    return { ok: true, data: null };
  } catch (error) {
    logActionError("deleteJob", error, { userId: auth.user.id });
    return actionError("INTERNAL_ERROR", "Impossible de supprimer l'offre");
  }
}

/**
 * Archive une candidature (soft delete) — disparaît du board, reste
 * consultable dans /archives.
 *
 * @param id Identifiant de la candidature.
 * @errors `UNAUTHENTICATED`, `VALIDATION_ERROR`, `INTERNAL_ERROR`.
 */
export async function archiveJob(id: string): Promise<ActionResult<null>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const parsed = archiveJobSchema.safeParse({ id });
  if (!parsed.success) {
    return actionError(
      "VALIDATION_ERROR",
      firstIssueMessage(parsed.error, "Impossible d'archiver l'offre")
    );
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
    return actionError("INTERNAL_ERROR", "Impossible d'archiver l'offre");
  }
}

/**
 * Restaure une candidature archivée — réapparaît dans le board, avec son
 * statut inchangé.
 *
 * @param id Identifiant de la candidature.
 * @errors `UNAUTHENTICATED`, `VALIDATION_ERROR`, `INTERNAL_ERROR`.
 */
export async function unarchiveJob(id: string): Promise<ActionResult<null>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const parsed = unarchiveJobSchema.safeParse({ id });
  if (!parsed.success) {
    return actionError(
      "VALIDATION_ERROR",
      firstIssueMessage(parsed.error, "Impossible de désarchiver l'offre")
    );
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
    return actionError("INTERNAL_ERROR", "Impossible de désarchiver l'offre");
  }
}

/**
 * Persiste un nouvel ordre de tri au sein d'une colonne du board, après un
 * drag & drop de réordonnancement intra-colonne.
 *
 * @param orderedIds IDs des candidatures dans leur nouvel ordre — chaque id
 * doit appartenir à l'utilisateur courant, sinon la transaction échoue
 * entière (aucune mise à jour partielle).
 * @errors `UNAUTHENTICATED`, `VALIDATION_ERROR` (liste vide),
 * `INTERNAL_ERROR`.
 */
export async function reorderJobs(
  orderedIds: string[]
): Promise<ActionResult<null>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const parsed = reorderJobsSchema.safeParse({ orderedIds });
  if (!parsed.success) {
    return actionError(
      "VALIDATION_ERROR",
      firstIssueMessage(parsed.error, "Impossible de réordonner les candidatures")
    );
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
    return actionError("INTERNAL_ERROR", "Impossible de réordonner les candidatures");
  }
}
