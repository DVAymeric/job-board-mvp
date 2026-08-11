"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeUrl } from "@/lib/url";
import { isJobStatus, JobStatus, STATUS } from "@/lib/constants";

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function checkJobUrl(
  rawUrl: string
): Promise<
  ActionResult<
    | { found: true; job: Awaited<ReturnType<typeof prisma.job.findUnique>> }
    | { found: false; normalizedUrl: string }
  >
> {
  try {
    const url = normalizeUrl(rawUrl);
    const job = await prisma.job.findUnique({ where: { url } });
    if (job) {
      return { ok: true, data: { found: true, job } };
    }
    return { ok: true, data: { found: false, normalizedUrl: url } };
  } catch {
    return { ok: false, error: "URL invalide" };
  }
}

export async function createJob(input: {
  url: string;
  titleCompany?: string;
  status: JobStatus;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const url = normalizeUrl(input.url);
    if (input.status !== STATUS.TO_APPLY && input.status !== STATUS.APPLIED) {
      return { ok: false, error: "Statut initial invalide" };
    }
    const job = await prisma.job.create({
      data: {
        url,
        titleCompany: input.titleCompany?.trim() || null,
        status: input.status,
        lastFollowUp: input.status === STATUS.APPLIED ? new Date() : null,
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
  try {
    if (!isJobStatus(status)) {
      return { ok: false, error: "Statut invalide" };
    }
    await prisma.job.update({
      where: { id },
      data: {
        status,
        ...(status === STATUS.APPLIED ? { lastFollowUp: new Date() } : {}),
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
  try {
    await prisma.job.update({
      where: { id },
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
  try {
    await prisma.job.update({
      where: { id },
      data: { titleCompany: titleCompany.trim() || null },
    });
    revalidatePath("/board");
    return { ok: true, data: null };
  } catch {
    return { ok: false, error: "Impossible de mettre à jour l'offre" };
  }
}

export async function deleteJob(id: string): Promise<ActionResult<null>> {
  try {
    await prisma.job.delete({ where: { id } });
    revalidatePath("/board");
    return { ok: true, data: null };
  } catch {
    return { ok: false, error: "Impossible de supprimer l'offre" };
  }
}
