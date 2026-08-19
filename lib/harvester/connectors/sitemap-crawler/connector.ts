import type { Connector, ConnectorContext } from "@/lib/harvester/connector";
import type { HarvestQuery, RawOffer } from "@/lib/harvester/harvest-query";
import { fetchSitemapCrawlerOffers, checkSitemapCrawlerHealth, SITEMAP_CRAWLER_CONNECTOR_ID } from "@/lib/harvester/connectors/sitemap-crawler/client";
import { normalizeJsonLdOffer } from "@/lib/harvester/connectors/sitemap-crawler/normalize";

export const sitemapCrawlerConnector: Connector = {
  id: SITEMAP_CRAWLER_CONNECTOR_ID,
  tier: 2,
  locationScoped: false,

  supports(query: HarvestQuery): boolean {
    return Boolean(query.targets?.sitemapCrawler && query.targets.sitemapCrawler.length > 0);
  },

  async *fetch(query: HarvestQuery, ctx: ConnectorContext): AsyncIterable<RawOffer> {
    for await (const item of fetchSitemapCrawlerOffers(query, { fetchImpl: ctx.fetchImpl })) {
      yield { source: SITEMAP_CRAWLER_CONNECTOR_ID, payload: item };
    }
  },

  normalize(raw: RawOffer) {
    return normalizeJsonLdOffer(raw);
  },

  async healthCheck() {
    return checkSitemapCrawlerHealth({});
  },
};
