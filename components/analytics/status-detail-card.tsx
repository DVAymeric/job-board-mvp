import { BentoCard } from "@/components/home/bento-card";
import type { FunnelStage } from "@/lib/analytics";

interface StatusDetailCardProps {
  stages: FunnelStage[];
}

export function StatusDetailCard({ stages }: StatusDetailCardProps) {
  return (
    <BentoCard
      span="4x1"
      tone="surface"
      className="p-0"
      bodyClassName="flex w-full flex-col divide-y divide-white/6 sm:flex-row sm:divide-x sm:divide-y-0"
    >
      {stages.map((stage) => (
        <div key={stage.status} className="flex-1 space-y-1.5 p-5">
          <p className="font-mono text-xs tracking-wide text-[#bfacc8] uppercase">
            {stage.label}
          </p>
          <p className="font-heading text-2xl font-medium text-white">
            {stage.count}
          </p>
          <p className="font-mono text-xs text-white/45">
            {stage.conversionFromPrevious === null
              ? "—"
              : `${stage.conversionFromPrevious}%`}
          </p>
        </div>
      ))}
    </BentoCard>
  );
}
