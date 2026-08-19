import type { ConnectorRun } from "@prisma/client";
import type { ConnectorHealth } from "@/lib/harvester/timed-health-check";

const CONNECTOR_LABELS: Record<string, string> = {
  francetravail: "France Travail",
  labonnealternance: "La Bonne Alternance",
  workday: "Workday",
  smartrecruiters: "SmartRecruiters",
  welcometothejungle: "Welcome to the Jungle",
  talentsoft: "Talentsoft",
  digitalrecruiters: "DigitalRecruiters",
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
      <p className="text-sm text-muted-foreground">
        Aucune collecte lancée pour le moment.
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
          className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs"
        >
          <span
            aria-hidden
            className={`size-1.5 rounded-full ${run.ok ? "bg-emerald-500" : "bg-destructive"}`}
          />
          <span className="font-medium">{CONNECTOR_LABELS[run.connectorId] ?? run.connectorId}</span>
          <span className="font-mono text-muted-foreground">
            {run.normalizedCount} offre{run.normalizedCount > 1 ? "s" : ""} · {formatRelativeDate(run.startedAt)}
          </span>
          {live?.[run.connectorId] ? <LiveStatusDot health={live[run.connectorId]!} /> : null}
        </li>
      ))}
      {liveOnlyIds.map((connectorId) => (
        <li
          key={connectorId}
          data-testid="connector-health-item"
          data-ok="unknown"
          className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs"
        >
          <span className="font-medium">{CONNECTOR_LABELS[connectorId] ?? connectorId}</span>
          <span className="font-mono text-muted-foreground">Jamais lancé</span>
          <LiveStatusDot health={live![connectorId]!} />
        </li>
      ))}
    </ul>
  );
}
