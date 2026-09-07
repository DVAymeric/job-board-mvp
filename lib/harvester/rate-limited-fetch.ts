import { logger } from "@/lib/logger";

const DEFAULT_BUCKET_CAPACITY = 3;
const DEFAULT_REFILL_PER_SECOND = 1;
// JOB-182 : backoff exponentiel — delay = baseDelayMs * 2^(tentative-1), jitter complet. Les
// valeurs par défaut reproduisent exactement l'ancien plafond fixe [500, 1000] pour MAX_ATTEMPTS
// par défaut (3), mais continuent de doubler au lieu de plafonner si maxAttempts est augmenté.
const DEFAULT_BASE_DELAY_MS = 500;
const DEFAULT_MAX_ATTEMPTS = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class TokenBucket {
  private tokens: number;
  private lastRefillAt: number;

  constructor(
    private readonly capacity: number,
    private readonly refillPerSecond: number,
  ) {
    this.tokens = capacity;
    this.lastRefillAt = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefillAt) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsedSeconds * this.refillPerSecond);
    this.lastRefillAt = now;
  }

  async take(): Promise<void> {
    this.refill();
    if (this.tokens < 1) {
      const waitMs = ((1 - this.tokens) / this.refillPerSecond) * 1000;
      await sleep(waitMs);
      this.refill();
    }
    this.tokens = Math.max(0, this.tokens - 1);
  }
}

function extractHostname(input: string | URL | Request): string {
  if (typeof input === "string") return new URL(input).hostname;
  if (input instanceof URL) return input.hostname;
  return new URL(input.url).hostname;
}

export interface RateLimitedFetchOptions {
  bucketCapacity?: number;
  refillPerSecond?: number;
  baseDelayMs?: number;
  maxAttempts?: number;
  // JOB-181 : le seau à jetons par défaut est une valeur uniforme pour tous les domaines, sans
  // lien avec une limite connue d'un site cible précis. Vide par défaut (aucun connecteur n'a
  // aujourd'hui de besoin identifié) — permet d'affiner un domaine spécifique sans changer le
  // défaut global des autres.
  perHostOverrides?: Record<string, { bucketCapacity?: number; refillPerSecond?: number }>;
}

// JOB-12 (job-harvester) : un seau à jetons par hostname — le rate limiting est intégré au
// fetch lui-même plutôt qu'une étape séparée dans l'orchestrateur (voir orchestrator.ts, qui
// en garde une instance partagée au niveau module).
export function createRateLimitedFetch(baseFetch: typeof fetch, options: RateLimitedFetchOptions = {}): typeof fetch {
  const bucketCapacity: number = options.bucketCapacity ?? DEFAULT_BUCKET_CAPACITY;
  const refillPerSecond: number = options.refillPerSecond ?? DEFAULT_REFILL_PER_SECOND;
  const baseDelayMs: number = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const maxAttempts: number = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const perHostOverrides = options.perHostOverrides ?? {};
  const buckets = new Map<string, TokenBucket>();

  return async function rateLimitedFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
    const hostname = extractHostname(input);
    let bucket = buckets.get(hostname);
    if (!bucket) {
      const override = perHostOverrides[hostname];
      bucket = new TokenBucket(override?.bucketCapacity ?? bucketCapacity, override?.refillPerSecond ?? refillPerSecond);
      buckets.set(hostname, bucket);
    }

    let response: Response | undefined;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await bucket.take();
      response = await baseFetch(input, init);
      if (response.status === 403) {
        // JOB-174 : un 403 (souvent un blocage anti-bot plutôt qu'un rate limit) était jusqu'ici
        // traité comme un succès HTTP ordinaire, indiscernable d'un "0 résultat" légitime.
        logger.warn("harvester.rate_limited_fetch.likely_blocked", { hostname, status: 403 });
      }
      if (response.status !== 429 && response.status < 500) return response;
      if (attempt < maxAttempts) {
        const maxDelay = baseDelayMs * 2 ** (attempt - 1);
        await sleep(Math.random() * maxDelay);
      }
    }
    return response as Response;
  };
}
