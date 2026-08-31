import type { ConnectorRun } from "@prisma/client";
import { ConnectorBadge } from "@/components/ui/connector-badge";
import { SOURCE_LABELS } from "@/lib/harvester/source-labels";
import type { ConnectorHealth } from "@/lib/harvester/timed-health-check";

const CONNECTOR_LABELS: Record<string, string> = {
  ...SOURCE_LABELS,
  "jsonld-generic": "Générique (JSON-LD)",
  "sitemap-crawler": "Générique (sitemap)",
};

function formatRelativeDate(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function LiveStatusDot({ health }: { health: ConnectorHealth }) {
  return (
    <span
      data-testid="connector-live-status"
      data-ok={health.ok}
      title={health.message ?? `${health.latencyMs}ms`}
      className="flex items-center gap-1"
    >
      <span
        aria-hidden
        className={`size-1.5 rounded-full ${health.ok ? "bg-emerald-500" : "bg-destructive"}`}
      />
      {!health.ok && health.message ? (
        <span className="font-mono text-muted-foreground">{health.message}</span>
      ) : null}
    </span>
  );
}

// JOB-59 : `runs` (dernier ConnectorRun connu en base) et `live` (résultat de healthCheck() à
// l'instant de la requête, optionnel — vide tant que l'utilisateur n'a pas cliqué "Vérifier
// maintenant") sont deux sources indépendantes. Un connecteur peut apparaître dans l'une sans
// l'autre : jamais lancé mais clé déjà expirée (live seul), ou lancé avec succès hier mais pas
// encore re-vérifié aujourd'hui (run seul).
export function ConnectorHealthList({
  runs,
  live,
}: {
  runs: ConnectorRun[];
  live?: Record<string, ConnectorHealth>;
}) {
  const liveOnlyIds = Object.keys(live ?? {}).filter(
    (connectorId) => !runs.some((run) => run.connectorId === connectorId)
  );

  if (runs.length === 0 && liveOnlyIds.length === 0) {
    return (
      <p className="text-base text-muted-foreground">
        Aucune recherche lancée pour le moment.
      </p>
    );
  }

  return (
    <ul className="flex flex-wrap gap-1.5">
      {runs.map((run) => (
        <li
          key={run.connectorId}
          data-testid="connector-health-item"
          data-ok={run.ok}
          className="flex items-center gap-1.5"
        >
          <ConnectorBadge
            label={CONNECTOR_LABELS[run.connectorId] ?? run.connectorId}
            active={run.ok}
            meta={`${run.normalizedCount} offre${run.normalizedCount > 1 ? "s" : ""} · ${formatRelativeDate(run.startedAt)}`}
          />
          {live?.[run.connectorId] ? <LiveStatusDot health={live[run.connectorId]!} /> : null}
        </li>
      ))}
      {liveOnlyIds.map((connectorId) => (
        <li
          key={connectorId}
          data-testid="connector-health-item"
          data-ok="unknown"
          className="flex items-center gap-1.5"
        >
          <ConnectorBadge
            label={CONNECTOR_LABELS[connectorId] ?? connectorId}
            active={live![connectorId]!.ok}
            meta="Jamais lancé"
          />
          <LiveStatusDot health={live![connectorId]!} />
        </li>
      ))}
    </ul>
  );
}
