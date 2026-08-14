import { z } from "zod";
import { checkJobUrlSchema } from "@/lib/validation";
import { scrapeJobMetadata, type ScrapedJobMetadata } from "@/lib/scraper";
import { logger } from "@/lib/logger";

// Pas de "use server" ici : ce module exporte des helpers synchrones et des
// types, ce que Next.js interdit dans un fichier Server Actions (tout export
// d'un module "use server" doit être une fonction async, appelable comme
// action réseau). Importé uniquement par les fichiers "use server" du dossier
// app/actions/ — jamais par un composant client.

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

export function firstIssueMessage(error: z.ZodError, fallback: string): string {
  return error.issues[0]?.message || fallback;
}

/**
 * Logue l'erreur réelle avant qu'un `catch` ne la remplace par le message
 * générique renvoyé à l'utilisateur (JOB-88). `userId` uniquement quand un
 * contexte authentifié vérifié est disponible (jamais fourni par le client).
 */
export function logActionError(
  action: string,
  error: unknown,
  context?: { userId?: string },
  level: "error" | "warn" = "error"
) {
  const fields = {
    action,
    error: error instanceof Error ? error.message : String(error),
    ...(context?.userId ? { userId: context.userId } : {}),
  };
  if (level === "warn") {
    logger.warn("action.failed", fields);
  } else {
    logger.error("action.failed", fields);
  }
}

/**
 * Scopes a Job lookup/mutation to its owner: `update`/`delete` throw
 * RecordNotFound (caught by the surrounding try/catch) if `id` exists but
 * belongs to a different user, instead of leaking or mutating cross-tenant.
 */
export function jobOwnerWhere(id: string, userId: string) {
  return { id_userId: { id, userId } };
}

export function contactOwnerWhere(id: string, userId: string) {
  return { id_userId: { id, userId } };
}

export function rateLimitError(retryAfterSeconds: number): string {
  return `Trop de requêtes. Réessaie dans ${retryAfterSeconds}s.`;
}

/**
 * Ne prend volontairement pas de `userId` en paramètre imposé par le client :
 * cette fonction n'est jamais exportée depuis un module "use server" (donc
 * jamais appelable directement par un client), seulement importée par les
 * Server Actions qui possèdent déjà leur propre contexte authentifié vérifié
 * (ex. checkRepost) ou qui l'appellent sans contexte (fetchJobMetadata,
 * public/anonyme depuis la landing page).
 */
export async function resolveScrapedMetadata(
  rawUrl: string,
  context?: { userId?: string }
): Promise<ScrapedJobMetadata> {
  const parsed = checkJobUrlSchema.safeParse(rawUrl);
  const empty: ScrapedJobMetadata = {
    title: null,
    companyName: null,
    descriptionText: null,
  };
  if (!parsed.success) {
    return empty;
  }
  return scrapeJobMetadata(parsed.data, context);
}
