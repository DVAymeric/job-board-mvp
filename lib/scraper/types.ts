// JOB-172 : "ok" (métadonnées trouvées ou légitimement absentes), "blocked" (page de blocage
// anti-bot détectée, 200 OK inclus), "notFound" (offre supprimée, 404), "error" (réseau, garde
// SSRF, ou tout autre statut HTTP non-ok) — jusqu'ici ces quatre cas convergeaient tous vers le
// même résultat vide, indiscernables pour l'appelant.
export type ScrapeStatus = "ok" | "blocked" | "notFound" | "error";

export type ScrapedJobMetadata = {
  title: string | null;
  companyName: string | null;
  descriptionText: string | null;
  status: ScrapeStatus;
};

/**
 * Contexte d'attribution optionnel pour les logs de scraping. `userId` ne
 * doit provenir que d'un appelant serveur déjà authentifié (`requireUser()`)
 * — jamais d'une valeur transmise par le client, pour éviter qu'un appelant
 * anonyme puisse usurper l'identité loguée.
 */
export type ScrapeContext = {
  userId?: string;
};

export function emptyScrapedMetadata(status: ScrapeStatus): ScrapedJobMetadata {
  return { title: null, companyName: null, descriptionText: null, status };
}

export const EMPTY_SCRAPED_METADATA: ScrapedJobMetadata = emptyScrapedMetadata("error");
