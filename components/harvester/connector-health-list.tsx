import type { ConnectorRun } from "@prisma/client";

const CONNECTOR_LABELS: Record<string, string> = {
  francetravail: "France Travail",
  labonnealternance: "La Bonne Alternance",
  workday: "Workday",
  smartrecruiters: "SmartRecruiters",
};

function formatRelativeDate(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(date);
}

export function ConnectorHealthList({ runs }: { runs: ConnectorRun[] }) {
  if (runs.length === 0) {
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
        </li>
      ))}
    </ul>
  );
}
