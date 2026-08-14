import { BentoCard } from "@/components/ui/bento-card";
import type { MostActiveMonth } from "@/lib/analytics";

interface ActiveMonthCardProps {
  month: MostActiveMonth | null;
}

export function ActiveMonthCard({ month }: ActiveMonthCardProps) {
  return (
    <BentoCard tone="accent" label="Mois le plus actif" title={month?.label ?? "—"}>
      {month ? (
        <div className="flex flex-1 flex-col justify-between gap-1">
          <p className="font-heading text-3xl font-medium text-white">{month.count}</p>
          <p>candidature{month.count > 1 ? "s" : ""} ce mois-ci</p>
        </div>
      ) : (
        <p>Aucune candidature récente</p>
      )}
    </BentoCard>
  );
}
