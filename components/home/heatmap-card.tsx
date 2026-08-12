import { BentoCard } from "@/components/home/bento-card";
import { ApplicationHeatmap } from "@/components/analytics/application-heatmap";
import type { HeatmapDay } from "@/lib/heatmap";

interface HeatmapCardProps {
  days: HeatmapDay[];
}

export function HeatmapCard({ days }: HeatmapCardProps) {
  return (
    <BentoCard span="1x2" label="Analytics" title="Heatmap d'activité">
      <ApplicationHeatmap days={days} compact />
    </BentoCard>
  );
}
