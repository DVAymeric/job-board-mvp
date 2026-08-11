import type { FunnelStage } from "@/lib/analytics";

const CHART_VARS = ["--chart-1", "--chart-2", "--chart-3", "--chart-4"];

export function FunnelChart({ stages }: { stages: FunnelStage[] }) {
  const maxCount = Math.max(1, ...stages.map((s) => s.count));

  return (
    <div className="space-y-6">
      <div
        className="space-y-3"
        role="img"
        aria-label="Funnel de conversion des candidatures par statut"
      >
        {stages.map((stage, index) => {
          const widthPct = Math.max((stage.count / maxCount) * 100, stage.count > 0 ? 3 : 0);
          return (
            <div key={stage.status} className="space-y-1">
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium text-foreground">{stage.label}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {stage.count}
                  {stage.conversionFromPrevious !== null &&
                    ` · ${stage.conversionFromPrevious}%`}
                </span>
              </div>
              <div className="h-6 w-full overflow-hidden rounded-md bg-muted">
                <div
                  className="h-full rounded-r-md ring-1 ring-inset ring-foreground/10"
                  style={{
                    width: `${widthPct}%`,
                    backgroundColor: `var(${CHART_VARS[index % CHART_VARS.length]})`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <table className="w-full text-sm">
        <caption className="sr-only">Détail du funnel de conversion par statut</caption>
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="py-1.5 font-medium">Statut</th>
            <th className="py-1.5 font-medium">Candidatures</th>
            <th className="py-1.5 font-medium">Conversion</th>
          </tr>
        </thead>
        <tbody>
          {stages.map((stage) => (
            <tr key={stage.status} className="border-b border-border last:border-0">
              <td className="py-1.5">{stage.label}</td>
              <td className="py-1.5 font-mono">{stage.count}</td>
              <td className="py-1.5 font-mono">
                {stage.conversionFromPrevious === null
                  ? "—"
                  : `${stage.conversionFromPrevious}%`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
