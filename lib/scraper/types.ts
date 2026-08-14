export type ScrapedJobMetadata = {
  title: string | null;
  companyName: string | null;
  descriptionText: string | null;
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

export const EMPTY_SCRAPED_METADATA: ScrapedJobMetadata = {
  title: null,
  companyName: null,
  descriptionText: null,
};
