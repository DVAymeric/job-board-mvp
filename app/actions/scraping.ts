"use server";

import type { ScrapedJobMetadata } from "@/lib/scraper";
import {
  type ActionResult,
  resolveCompanyLogo,
  resolveScrapedMetadata,
} from "./_shared";

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
  return { ok: true, data: { logoUrl: await resolveCompanyLogo(rawUrl) } };
}
