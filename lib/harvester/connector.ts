import type { NormalizedOffer } from "@/lib/harvester/normalized-offer";
import type { ConnectorHealth } from "@/lib/harvester/timed-health-check";
import type { HarvestQuery, RawOffer } from "@/lib/harvester/harvest-query";

export interface ConnectorContext {
  fetchImpl: typeof fetch;
  env: Record<string, string | undefined>;
}

// Interface de plugin connecteur (JOB-45) — introduite ici plutôt qu'aux tickets 4/5 : sans
// orchestrateur pour la consommer, elle serait restée une abstraction sans appelant.
export interface Connector {
  id: string;
  tier: 0 | 1 | 2;
  locationScoped?: boolean;
  supports(query: HarvestQuery): boolean;
  fetch(query: HarvestQuery, ctx: ConnectorContext): AsyncIterable<RawOffer>;
  normalize(raw: RawOffer): NormalizedOffer;
  healthCheck(): Promise<ConnectorHealth>;
}
