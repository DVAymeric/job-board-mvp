import type { Connector, ConnectorContext } from "@/lib/harvester/connector";
import type { HarvestQuery, RawOffer } from "@/lib/harvester/harvest-query";
import { fetchWorkdayOffers, checkWorkdayHealth, WORKDAY_CONNECTOR_ID } from "@/lib/harvester/connectors/workday/client";
import { normalizeWorkdayOffer } from "@/lib/harvester/connectors/workday/normalize";

export const workdayConnector: Connector = {
  id: WORKDAY_CONNECTOR_ID,
  tier: 1,
  locationScoped: false,

  supports(query: HarvestQuery): boolean {
    return Boolean(query.targets?.workday && query.targets.workday.length > 0);
  },

  async *fetch(query: HarvestQuery, ctx: ConnectorContext): AsyncIterable<RawOffer> {
    for await (const item of fetchWorkdayOffers(query, { fetchImpl: ctx.fetchImpl })) {
      yield { source: WORKDAY_CONNECTOR_ID, payload: item };
    }
  },

  normalize(raw: RawOffer) {
    return normalizeWorkdayOffer(raw);
  },

  async healthCheck() {
    return checkWorkdayHealth({});
  },
};
