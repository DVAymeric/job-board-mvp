import { BentoCard } from "@/components/ui/bento-card";
import { STATUS_ORDER, STATUS_CONFIG, JobStatus } from "@/lib/constants";

interface KanbanPreviewCardProps {
  counts: Record<JobStatus, number>;
}

export function KanbanPreviewCard({ counts }: KanbanPreviewCardProps) {
  const max = Math.max(...Object.values(counts));

  return (
    <BentoCard span="2x2" tone="dark" label="Board" title="Kanban drag & drop">
      <p>À postuler → Postulé → Entretien → Refusé. Glissez, c&apos;est mis à jour.</p>
      <div className="mt-auto grid grid-cols-2 gap-2 sm:grid-cols-4">
        {STATUS_ORDER.map((status) => {
          const count = counts[status];
          const width = max > 0 ? Math.round((count / max) * 100) : 0;
          return (
            <div
              key={status}
              className="flex flex-col gap-1 rounded-lg bg-white/10 p-1.5"
            >
              <span className="font-mono text-[10px] text-white/50">
                {STATUS_CONFIG[status].label}
              </span>
              <span
                data-testid={`kanban-bar-${status}`}
                aria-hidden
                className="h-2 rounded bg-[#bfacc8]"
                style={{ width: `${width}%` }}
              />
              <span
                data-testid={`kanban-count-${status}`}
                className="font-mono text-xs text-white/80"
              >
                {count}
              </span>
            </div>
          );
        })}
      </div>
    </BentoCard>
  );
}
