const DEFAULT_MIN_DELAY_MS = 1000;

// JOB-58 (job-harvester, JOB-7) : `DomainRateLimiter` (packages/harvester/src/rate-limit/
// domain-rate-limiter.ts) n'existe plus dans @job-harvester/harvester — remplacé par le token
// bucket par hostname de createRateLimitedFetch (déjà porté, orchestrator.ts), qui enveloppe
// déjà chaque requête. Ce limiteur local garde le même rôle pour un connecteur (sitemap-crawler)
// qui parcourt de nombreuses URLs du même domaine indépendamment de fetchImpl — espacement
// minimal explicite, pas un remplacement du rate-limiting global.
export class DomainRateLimiter {
  private readonly lastCallAt = new Map<string, number>();

  constructor(private readonly minDelayMs: number = DEFAULT_MIN_DELAY_MS) {}

  async wait(key: string): Promise<void> {
    const now = Date.now();
    const last = this.lastCallAt.get(key);
    if (last !== undefined) {
      const elapsed = now - last;
      if (elapsed < this.minDelayMs) {
        await new Promise((resolve) => setTimeout(resolve, this.minDelayMs - elapsed));
      }
    }
    this.lastCallAt.set(key, Date.now());
  }
}

const sharedLimiter = new DomainRateLimiter();

export async function waitForDomain(url: string): Promise<void> {
  await sharedLimiter.wait(new URL(url).hostname);
}
