"use server";

import { checkJobUrlSchema } from "@/lib/validation";
import { safeFetch } from "@/lib/safe-fetch";
import type { ScrapedJobMetadata } from "@/lib/scraper";
import {
  buildBrandfetchLogoUrl,
  buildClearbitLogoUrl,
  extractCompanyDomain,
} from "@/lib/company-logo";
import { type ActionResult, logActionError, resolveScrapedMetadata } from "./_shared";

/**
 * Scrape une URL d'offre pour en extraire titre/entreprise/description
 * (Cheerio, avec repli Playwright si aucun titre exploitable — voir
 * lib/scraper/). Appelable sans authentification (utilisé aussi depuis la
 * home publique) — ne touche jamais la base de données.
 *
 * @param rawUrl URL de l'offre à scraper.
 * @returns Toujours `ok: true` — un échec de scraping renvoie des champs
 * `null`, jamais une erreur (l'appelant bascule alors sur le repli manuel).
 */
export async function fetchJobMetadata(
  rawUrl: string
): Promise<ActionResult<ScrapedJobMetadata>> {
  return { ok: true, data: await resolveScrapedMetadata(rawUrl) };
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
 * essaie Clearbit puis Brandfetch en repli (si `BRANDFETCH_CLIENT_ID` est
 * configuré). N'envoie jamais que le nom de domaine à ces tiers, jamais
 * l'URL complète ni le contenu de la candidature (JOB-121).
 *
 * @param rawUrl URL de l'offre dont on veut le logo de l'entreprise.
 * @returns `{ logoUrl }` — `null` si aucun logo n'a pu être résolu.
 * Toujours `ok: true` : un échec de résolution renvoie `logoUrl: null`,
 * jamais une erreur.
 */
export async function fetchCompanyLogo(
  rawUrl: string
): Promise<ActionResult<{ logoUrl: string | null }>> {
  const empty = { logoUrl: null };
  const parsed = checkJobUrlSchema.safeParse(rawUrl);
  if (!parsed.success) {
    return { ok: true, data: empty };
  }
  const domain = extractCompanyDomain(parsed.data);
  if (!domain) {
    return { ok: true, data: empty };
  }

  const clearbitUrl = buildClearbitLogoUrl(domain);
  if (await logoUrlResolves(clearbitUrl)) {
    return { ok: true, data: { logoUrl: clearbitUrl } };
  }

  const brandfetchClientId = process.env.BRANDFETCH_CLIENT_ID;
  if (brandfetchClientId) {
    const brandfetchUrl = buildBrandfetchLogoUrl(domain, brandfetchClientId);
    if (await logoUrlResolves(brandfetchUrl)) {
      return { ok: true, data: { logoUrl: brandfetchUrl } };
    }
  }

  return { ok: true, data: empty };
}
