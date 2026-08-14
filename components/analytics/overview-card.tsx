import { BentoCard } from "@/components/ui/bento-card";
import { STATUS_ORDER, STATUS_CONFIG, type JobStatus } from "@/lib/constants";

interface OverviewCardProps {
  total: number;
  statusCounts: Record<JobStatus, number>;
}

export function OverviewCard({ total, statusCounts }: OverviewCardProps) {
  return (
    <BentoCard span="2x1" tone="muted" label="Vue d'ensemble" className="justify-center">
      <div className="flex items-baseline gap-2.5 font-heading text-4xl leading-none text-palette-nuit">
        {total}
        <span className="font-mono text-sm font-normal text-palette-encre/70">
          candidature{total > 1 ? "s" : ""} suivie{total > 1 ? "s" : ""} au
          total
        </span>
      </div>
      <div className="mt-3.5 flex flex-wrap gap-2">
        {STATUS_ORDER.map((status) => (
          <span
            key={status}
            className="rounded-full border border-white/40 bg-white/50 px-2.5 py-1 font-mono text-xs text-palette-encre"
          >
            <b className="font-semibold text-palette-nuit">
              {statusCounts[status]}
            </b>{" "}
            {STATUS_CONFIG[status].label}
          </span>
        ))}
      </div>
    </BentoCard>
  );
}
