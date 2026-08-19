export interface ConnectorHealth {
  connectorId: string;
  ok: boolean;
  latencyMs: number;
  checkedAt: string;
  message?: string;
}

// JOB-36 (job-harvester) : les connecteurs implémentent chacun le même bloc try/catch (mesure de
// latence, probe réseau, forme de retour identique en succès comme en échec) — factorisé ici.
//
// `probe` renvoie soit un `Response` fetch (LBA : succès = `.ok`, échec HTTP = message
// `HTTP {status}`), soit toute autre valeur/`void` (France Travail : succès = n'a pas levé
// d'exception, l'échec réseau/auth se manifeste par un throw dans `probe`).
export async function timedHealthCheck(connectorId: string, probe: () => Promise<unknown>): Promise<ConnectorHealth> {
  const start = Date.now();
  try {
    const result = await probe();
    const isHttpResponse = result instanceof Response;
    return {
      connectorId,
      ok: isHttpResponse ? result.ok : true,
      latencyMs: Date.now() - start,
      checkedAt: new Date().toISOString(),
      message: isHttpResponse && !result.ok ? `HTTP ${result.status}` : undefined,
    };
  } catch (error) {
    return {
      connectorId,
      ok: false,
      latencyMs: Date.now() - start,
      checkedAt: new Date().toISOString(),
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

// JOB-59 : `healthCheck()` interroge une API tierce sans AbortSignal — un connecteur qui bloque
// (source down sans reset TCP) ne peut pas être annulé à la source. Cette course borne le temps
// d'attente côté appelant (Server Action agrégeant les 9 connecteurs) pour qu'un connecteur en
// panne n'empêche pas de rendre le statut des 8 autres.
export async function healthCheckWithTimeout(
  connectorId: string,
  check: () => Promise<ConnectorHealth>,
  timeoutMs: number
): Promise<ConnectorHealth> {
  const start = Date.now();
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<ConnectorHealth>((resolve) => {
    timer = setTimeout(() => {
      resolve({
        connectorId,
        ok: false,
        latencyMs: Date.now() - start,
        checkedAt: new Date().toISOString(),
        message: `Timeout after ${timeoutMs}ms`,
      });
    }, timeoutMs);
  });
  try {
    return await Promise.race([check(), timeout]);
  } finally {
    clearTimeout(timer!);
  }
}
