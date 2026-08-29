import type { ConnectorRun } from "@prisma/client";
import { ConnectorBadge } from "@/components/ui/connector-badge";

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
      <p className="text-base text-muted-foreground">
        Aucune collecte lancée pour le moment.
      </p>
    );
  }

  return (
    <ul className="flex flex-wrap gap-1.5">
      {runs.map((run) => (
        <li key={run.connectorId} data-testid="connector-health-item" data-ok={run.ok}>
          <ConnectorBadge
            label={CONNECTOR_LABELS[run.connectorId] ?? run.connectorId}
            active={run.ok}
            meta={`${run.normalizedCount} offre${run.normalizedCount > 1 ? "s" : ""} · ${formatRelativeDate(run.startedAt)}`}
          />
        </li>
      ))}
    </ul>
  );
}
