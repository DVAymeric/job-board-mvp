import { z } from "zod";
import * as Sentry from "@sentry/nextjs";
import { checkJobUrlSchema } from "@/lib/validation";
import { scrapeJobMetadata, type ScrapedJobMetadata } from "@/lib/scraper";
import { safeFetch } from "@/lib/safe-fetch";
import {
  buildBrandfetchLogoUrl,
  buildClearbitLogoUrl,
  extractCompanyDomain,
} from "@/lib/company-logo";
import { logger } from "@/lib/logger";
import type { ActionErrorCode } from "@/lib/types";

// Pas de "use server" ici : ce module exporte des helpers synchrones et des
// types, ce que Next.js interdit dans un fichier Server Actions (tout export
// d'un module "use server" doit être une fonction async, appelable comme
// action réseau). Importé uniquement par les fichiers "use server" du dossier
// app/actions/ — jamais par un composant client.

export type { ActionResult, ActionErrorCode } from "@/lib/types";

/** Raccourci pour construire une erreur { ok: false, error, code } (JOB-89). */
export function actionError(
  code: ActionErrorCode,
  message: string
): { ok: false; error: string; code: ActionErrorCode } {
  return { ok: false, error: message, code };
}

export function firstIssueMessage(error: z.ZodError, fallback: string): string {
  return error.issues[0]?.message || fallback;
}

/**
 * Logue l'erreur réelle avant qu'un `catch` ne la remplace par le message
 * générique renvoyé à l'utilisateur (JOB-88). `userId` uniquement quand un
 * contexte authentifié vérifié est disponible (jamais fourni par le client).
 *
 * Remonte aussi à Sentry au niveau "error" (JOB-113) — pas "warn", qui couvre
 * des conditions attendues (rate limit, validation) plutôt que des bugs.
 * Sans SENTRY_DSN configuré (dev/CI), Sentry.captureException est un no-op
 * silencieux (cf. instrumentation.ts).
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
    return;
  }
  logger.error("action.failed", fields);
  Sentry.captureException(error, {
    tags: { action },
    ...(context?.userId ? { user: { id: context.userId } } : {}),
  });
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

const LOGO_FETCH_TIMEOUT_MS = 3000;

async function logoUrlResolves(url: string): Promise<boolean> {
  try {
    const response = await safeFetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(LOGO_FETCH_TIMEOUT_MS),
    });
    return (
      !!response &&
      response.ok &&
      (response.headers.get("content-type") ?? "").startsWith("image/")
    );
  } catch (error) {
    logActionError("fetchCompanyLogo", error, undefined, "warn");
    return false;
  }
}

/**
 * Résout un logo d'entreprise à partir du domaine d'une URL d'offre —
 * Clearbit puis Brandfetch en repli (si `BRANDFETCH_CLIENT_ID` est
 * configuré). N'envoie jamais que le nom de domaine à ces tiers (JOB-121).
 * Partagée entre `fetchCompanyLogo` (appel direct depuis le client, avant
 * ce ticket) et `enrichJob` (enrichissement en tâche de fond) — même raison
 * que `resolveScrapedMetadata` : une seule implémentation, pas de
 * duplication de la logique de repli.
 */
export async function resolveCompanyLogo(rawUrl: string): Promise<string | null> {
  const parsed = checkJobUrlSchema.safeParse(rawUrl);
  if (!parsed.success) return null;

  const domain = extractCompanyDomain(parsed.data);
  if (!domain) return null;

  const clearbitUrl = buildClearbitLogoUrl(domain);
  if (await logoUrlResolves(clearbitUrl)) return clearbitUrl;

  const brandfetchClientId = process.env.BRANDFETCH_CLIENT_ID;
  if (brandfetchClientId) {
    const brandfetchUrl = buildBrandfetchLogoUrl(domain, brandfetchClientId);
    if (await logoUrlResolves(brandfetchUrl)) return brandfetchUrl;
  }

  return null;
}
