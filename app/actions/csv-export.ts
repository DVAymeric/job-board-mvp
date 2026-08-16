"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/plan";
import { buildJobsCsv } from "@/lib/csv-export";
import { actionError, type ActionResult, logActionError } from "./_shared";

/**
 * Génère un export CSV de toutes les candidatures de l'utilisateur courant.
 *
 * @returns `{ csv }` — contenu CSV complet, à télécharger côté client.
 * @errors `UNAUTHENTICATED`, `FORBIDDEN` (palier non entitled — cf.
 * lib/plan.ts, JOB-80 ; toujours autorisé aujourd'hui), `INTERNAL_ERROR`.
 */
export async function exportJobsCsv(): Promise<ActionResult<{ csv: string }>> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  // Exemple d'usage du point d'extension palier payant (JOB-80) — toujours
  // vrai aujourd'hui (un seul plan, FREE, entitled à tout).
  if (!(await can(auth.user.id, "csv_export"))) {
    return actionError("FORBIDDEN", "Fonctionnalité non disponible sur votre offre");
  }

  try {
    const jobs = await prisma.job.findMany({
      where: { userId: auth.user.id },
      include: { tags: { include: { tag: true } } },
      orderBy: { createdAt: "asc" },
    });
    return { ok: true, data: { csv: buildJobsCsv(jobs) } };
  } catch (error) {
    logActionError("exportJobsCsv", error, { userId: auth.user.id });
    return actionError("INTERNAL_ERROR", "Impossible de générer l'export CSV");
  }
}
