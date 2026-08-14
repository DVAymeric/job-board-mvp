export type ScrapedJobMetadata = {
  title: string | null;
  companyName: string | null;
  descriptionText: string | null;
};

export const EMPTY_SCRAPED_METADATA: ScrapedJobMetadata = {
  title: null,
  companyName: null,
  descriptionText: null,
};
