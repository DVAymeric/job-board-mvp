import { BentoCard } from "@/components/home/bento-card";
import { STATUS_ORDER, STATUS_CONFIG, type JobStatus } from "@/lib/constants";

interface OverviewCardProps {
  total: number;
  statusCounts: Record<JobStatus, number>;
}

export function OverviewCard({ total, statusCounts }: OverviewCardProps) {
  return (
    <BentoCard
      span="2x1"
      tone="dark"
      label="Vue d'ensemble"
      className="justify-center to-[#29223d]"
    >
      <div className="flex items-baseline gap-2.5 font-heading text-4xl leading-none text-white">
        {total}
        <span className="font-mono text-sm font-normal text-[#bfacc8]">
          candidature{total > 1 ? "s" : ""} suivie{total > 1 ? "s" : ""} au
          total
        </span>
      </div>
      <div className="mt-3.5 flex flex-wrap gap-2">
        {STATUS_ORDER.map((status) => (
          <span
            key={status}
            className="rounded-full border border-white/10 bg-white/8 px-2.5 py-1 font-mono text-xs text-white/75"
          >
            <b className="font-semibold text-white">{statusCounts[status]}</b>{" "}
            {STATUS_CONFIG[status].label}
          </span>
        ))}
      </div>
    </BentoCard>
  );
}
