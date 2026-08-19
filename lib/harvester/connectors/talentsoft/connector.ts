import type { Connector, ConnectorContext } from "@/lib/harvester/connector";
import type { HarvestQuery, RawOffer } from "@/lib/harvester/harvest-query";
import { fetchTalentsoftOffers, checkTalentsoftHealth, TALENTSOFT_CONNECTOR_ID } from "@/lib/harvester/connectors/talentsoft/client";
import { normalizeTalentsoftOffer } from "@/lib/harvester/connectors/talentsoft/normalize";

export const talentsoftConnector: Connector = {
  id: TALENTSOFT_CONNECTOR_ID,
  tier: 1,
  locationScoped: false,

  supports(query: HarvestQuery): boolean {
    return Boolean(query.targets?.talentsoft && query.targets.talentsoft.length > 0);
  },

  async *fetch(query: HarvestQuery, ctx: ConnectorContext): AsyncIterable<RawOffer> {
    for await (const item of fetchTalentsoftOffers(query, { fetchImpl: ctx.fetchImpl })) {
      yield { source: TALENTSOFT_CONNECTOR_ID, payload: item };
    }
  },

  normalize(raw: RawOffer) {
    return normalizeTalentsoftOffer(raw);
  },

  async healthCheck() {
    return checkTalentsoftHealth({});
  },
};
