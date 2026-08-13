import { BentoCard } from "@/components/home/bento-card";
import { ApplicationHeatmap } from "@/components/analytics/application-heatmap";
import type { HeatmapDay } from "@/lib/heatmap";

interface HeatmapBentoCardProps {
  days: HeatmapDay[];
}

export function HeatmapBentoCard({ days }: HeatmapBentoCardProps) {
  return (
    <BentoCard
      span="2x2"
      tone="surface"
      label="Fréquence de candidature"
      title="Régularité sur 12 mois"
    >
      <ApplicationHeatmap days={days} levels={3} />
    </BentoCard>
  );
}
