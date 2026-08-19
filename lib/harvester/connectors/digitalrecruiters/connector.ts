import type { Connector, ConnectorContext } from "@/lib/harvester/connector";
import type { HarvestQuery, RawOffer } from "@/lib/harvester/harvest-query";
import { fetchDigitalRecruitersOffers, checkDigitalRecruitersHealth, DIGITALRECRUITERS_CONNECTOR_ID } from "@/lib/harvester/connectors/digitalrecruiters/client";
import { normalizeDigitalRecruitersOffer } from "@/lib/harvester/connectors/digitalrecruiters/normalize";

export const digitalRecruitersConnector: Connector = {
  id: DIGITALRECRUITERS_CONNECTOR_ID,
  tier: 1,
  locationScoped: false,

  supports(query: HarvestQuery): boolean {
    return Boolean(query.targets?.digitalRecruiters && query.targets.digitalRecruiters.length > 0);
  },

  async *fetch(query: HarvestQuery, ctx: ConnectorContext): AsyncIterable<RawOffer> {
    for await (const item of fetchDigitalRecruitersOffers(query, { fetchImpl: ctx.fetchImpl })) {
      yield { source: DIGITALRECRUITERS_CONNECTOR_ID, payload: item };
    }
  },

  normalize(raw: RawOffer) {
    return normalizeDigitalRecruitersOffer(raw);
  },

  async healthCheck() {
    return checkDigitalRecruitersHealth({});
  },
};
