import { BentoCard } from "@/components/ui/bento-card";
import { ApplicationHeatmap } from "@/components/analytics/application-heatmap";
import type { HeatmapDay } from "@/lib/heatmap";

interface HeatmapCardProps {
  days: HeatmapDay[];
}

export function HeatmapCard({ days }: HeatmapCardProps) {
  return (
    <BentoCard label="Analytics" title="Heatmap d'activité">
      <ApplicationHeatmap days={days} compact />
    </BentoCard>
  );
}
