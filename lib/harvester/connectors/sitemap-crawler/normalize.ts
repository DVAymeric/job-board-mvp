// Les pages atteintes par un crawl de sitemap portent le même JSON-LD schema.org/JobPosting que
// les URLs cibles configurées directement pour jsonld-generic (les deux passent par lib/jsonld.ts)
// — on réutilise donc ce mapping plutôt que de le dupliquer.
export { normalizeJsonLdOffer } from "@/lib/harvester/connectors/jsonld-generic/normalize";
