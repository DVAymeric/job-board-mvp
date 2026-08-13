import type { FunnelStage } from "@/lib/analytics";

const CHART_VARS = ["--chart-1", "--chart-2", "--chart-3", "--chart-4"];

export function FunnelChart({ stages }: { stages: FunnelStage[] }) {
  const maxCount = Math.max(1, ...stages.map((s) => s.count));

  return (
    <div
      className="space-y-3.5"
      role="img"
      aria-label="Funnel de conversion des candidatures par statut"
    >
      {stages.map((stage, index) => {
        const widthPct = Math.max((stage.count / maxCount) * 100, stage.count > 0 ? 3 : 0);
        return (
          <div key={stage.status} className="space-y-1.5">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-white">{stage.label}</span>
              <span className="font-mono text-xs text-white/50">
                {stage.count}
                {stage.conversionFromPrevious !== null &&
                  ` · ${stage.conversionFromPrevious}%`}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/6">
              <div
                data-funnel-bar
                className="h-full rounded-full"
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
  );
}
