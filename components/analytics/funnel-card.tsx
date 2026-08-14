import { BentoCard } from "@/components/ui/bento-card";
import { FunnelChart } from "@/components/analytics/funnel-chart";
import type { FunnelStage } from "@/lib/analytics";

interface FunnelCardProps {
  stages: FunnelStage[];
}

export function FunnelCard({ stages }: FunnelCardProps) {
  return (
    <BentoCard
      span="2x2"
      tone="default"
      label="Funnel de conversion"
      title="De l'idée à l'entretien"
    >
      <FunnelChart stages={stages} />
    </BentoCard>
  );
}
