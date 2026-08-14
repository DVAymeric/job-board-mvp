export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

export interface RateLimiter {
  check(key: string): RateLimitResult;
}

/**
 * Limiteur à fenêtre glissante, en mémoire du process (décision produit :
 * pas de dépendance externe pour la v1). Chaque instance serverless a sa
 * propre mémoire, donc sous Vercel multi-instance la limite effective est
 * (nombre d'instances × limit), pas un plafond global strict — acceptable
 * pour un premier niveau de protection anti-abus. `RateLimiter` reste
 * l'interface à implémenter pour un futur remplacement par un store
 * partagé (ex. Upstash Ratelimit) sans changer les appelants.
 */
export class InMemorySlidingWindowRateLimiter implements RateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number
  ) {}

  check(key: string): RateLimitResult {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const recent = (this.hits.get(key) ?? []).filter((t) => t > windowStart);

    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      const retryAfterMs = recent[0] + this.windowMs - now;
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
    }

    recent.push(now);
    this.hits.set(key, recent);
    return { allowed: true };
  }
}
