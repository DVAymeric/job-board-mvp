import { BentoCard } from "@/components/ui/bento-card";
import type { FunnelStage } from "@/lib/analytics";

interface StatusDetailCardProps {
  stages: FunnelStage[];
}

export function StatusDetailCard({ stages }: StatusDetailCardProps) {
  return (
    <BentoCard
      span="4x1"
      tone="default"
      className="p-0"
      bodyClassName="flex w-full flex-col divide-y divide-border sm:flex-row sm:divide-x sm:divide-y-0"
    >
      {stages.map((stage) => (
        <div key={stage.status} className="flex-1 space-y-1.5 p-5">
          <p className="font-mono text-xs tracking-wide text-palette-orchidee uppercase">
            {stage.label}
          </p>
          <p className="font-heading text-2xl font-medium text-heading">
            {stage.count}
          </p>
          <p className="font-mono text-xs text-muted-foreground">
            {stage.conversionFromPrevious === null
              ? "—"
              : `${stage.conversionFromPrevious}%`}
          </p>
        </div>
      ))}
    </BentoCard>
  );
}
