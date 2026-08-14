"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { JobStatus, STATUS } from "@/lib/constants";
import { InMemorySlidingWindowRateLimiter } from "@/lib/rate-limit";
import { type DiffLine, diffLines, hasContentChanged } from "@/lib/repost-diff";
import {
  checkJobUrlSchema,
  checkRepostSchema,
  createJobSchema,
  reactivateJobSchema,
} from "@/lib/validation";
import {
  actionError,
  type ActionResult,
  firstIssueMessage,
  jobOwnerWhere,
  logActionError,
  rateLimitError,
  resolveScrapedMetadata,
} from "./_shared";

// checkJobUrl est le premier appel du flow de collage d'URL (suivi de
// fetchJobMetadata, coûteux — jusqu'au fallback Playwright) ; createJob
// est l'écriture qui conclut ce même flow. Rate-limités par userId pour
// éviter l'abus (JOB-81). Limiteur en mémoire du process — cf. lib/rate-limit.ts.
const CHECK_JOB_URL_RATE_LIMIT = new InMemorySlidingWindowRateLimiter(30, 60_000);
const CREATE_JOB_RATE_LIMIT = new InMemorySlidingWindowRateLimiter(30, 60_000);

/**
 * Vérifie si une URL d'offre est déjà enregistrée pour l'utilisateur
 * courant. Premier appel du flow de collage d'URL sur la home.
 *
 * @param rawUrl URL brute collée par l'utilisateur (sera normalisée).
 * @returns `{ found: true, job }` si déjà connue, sinon
 * `{ found: false, normalizedUrl }` pour poursuivre vers `fetchJobMetadata`.
 * @errors `UNAUTHENTICATED`, `RATE_LIMITED`, `VALIDATION_ERROR` (URL
 * invalide), `INTERNAL_ERROR`.
 */
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

  const limit = CHECK_JOB_URL_RATE_LIMIT.check(auth.user.id);
  if (!limit.allowed) {
    return actionError("RATE_LIMITED", rateLimitError(limit.retryAfterSeconds));
  }

  const parsed = checkJobUrlSchema.safeParse(rawUrl);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", firstIssueMessage(parsed.error, "URL invalide"));
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
  } catch (error) {
    logActionError("checkJobUrl", error, { userId: auth.user.id });
    return actionError("INTERNAL_ERROR", "Impossible de vérifier cette offre");
  }
}

/**
 * Crée une candidature pour l'utilisateur courant. Second appel du flow de
 * collage d'URL, après `checkJobUrl` (et `fetchJobMetadata`/
 * `fetchCompanyLogo` côté client) — ou appelé directement pour le repli
 * manuel quand le scraping échoue.
 *
 * @param input.url URL de l'offre (déjà normalisée par l'appelant).
 * @param input.status Statut initial — uniquement `TO_APPLY` ou `APPLIED`.
 * @returns `{ id }` de la candidature créée.
 * @errors `UNAUTHENTICATED`, `RATE_LIMITED`, `VALIDATION_ERROR`,
 * `CONFLICT` (URL déjà enregistrée pour cet utilisateur — idempotence,
 * JOB-91), `INTERNAL_ERROR`.
 */
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

  const limit = CREATE_JOB_RATE_LIMIT.check(auth.user.id);
  if (!limit.allowed) {
    return actionError("RATE_LIMITED", rateLimitError(limit.retryAfterSeconds));
  }

  const parsed = createJobSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("VALIDATION_ERROR", firstIssueMessage(parsed.error, "Offre invalide"));
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
      return actionError("CONFLICT", "Cette offre a déjà été enregistrée");
    }
    logActionError("createJob", error, { userId: auth.user.id });
    return actionError("INTERNAL_ERROR", "Impossible d'enregistrer cette offre");
  }
}

/**
 * Compare le contenu actuellement en ligne d'une offre archivée avec celui
 * enregistré, pour détecter une republication avec un contenu différent.
 *
 * @param id Identifiant de la candidature (doit être archivée).
 * @returns Diff structuré (`changed`, `diff`, `fresh`) entre le contenu
 * archivé et le contenu fraîchement scrapé.
 * @errors `UNAUTHENTICATED`, `VALIDATION_ERROR`, `NOT_FOUND`, `CONFLICT`
 * (l'offre n'est pas archivée), `INTERNAL_ERROR`.
 */
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
    return actionError(
      "VALIDATION_ERROR",
      firstIssueMessage(parsed.error, "Identifiant invalide")
    );
  }
  let job;
  try {
    job = await prisma.job.findUnique({
      where: jobOwnerWhere(parsed.data.id, auth.user.id),
    });
  } catch (error) {
    logActionError("checkRepost", error, { userId: auth.user.id });
    return actionError("INTERNAL_ERROR", "Impossible de vérifier cette offre");
  }
  if (!job) {
    return actionError("NOT_FOUND", "Offre introuvable");
  }
  if (!job.archived) {
    return actionError("CONFLICT", "Cette offre est déjà active");
  }

  const fresh = await resolveScrapedMetadata(job.url, { userId: auth.user.id });

  return {
    ok: true,
    data: {
      changed: hasContentChanged(job.descriptionText, fresh.descriptionText),
      diff: diffLines(job.descriptionText, fresh.descriptionText),
      fresh,
    },
  };
}

/**
 * Désarchive une offre republiée en remplaçant son contenu par la version
 * fraîchement scrapée (suite à un `checkRepost` positif), et remet son
 * statut à `TO_APPLY`.
 *
 * @param input.id Identifiant de la candidature.
 * @param input.title Nouveau titre (peut être `null`).
 * @param input.companyName Nouvelle entreprise (peut être `null`).
 * @param input.descriptionText Nouvelle description (peut être `null`).
 * @errors `UNAUTHENTICATED`, `VALIDATION_ERROR`, `INTERNAL_ERROR`.
 */
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
    return actionError(
      "VALIDATION_ERROR",
      firstIssueMessage(parsed.error, "Impossible de réactiver l'offre")
    );
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
  } catch (error) {
    logActionError("reactivateJobWithContent", error, { userId: auth.user.id });
    return actionError("INTERNAL_ERROR", "Impossible de réactiver l'offre");
  }
}
